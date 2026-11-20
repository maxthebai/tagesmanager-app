package expo.modules.agentglyph

import android.content.ComponentName
import android.content.Context
import android.os.Handler
import android.os.Looper
import java.lang.reflect.Proxy

/**
 * Steuert die Glyph-LEDs der Phone (3a) / (3a) Pro über das Nothing-SDK (com.nothing.ketchum), komplett per Reflexion.
 * LED-Indizes laut SDK: C = 0-19, A = 20-30, B = 31-35.
 */
class GlyphController(private val ctx: Context) {
  private val main = Handler(Looper.getMainLooper())
  private var gm: Any? = null
  private var ready = false
  private var connecting = false
  private var pending: (() -> Unit)? = null
  private var blinkOn = false
  private var blinking = false

  private val blinkTick = object : Runnable {
    override fun run() {
      if (!blinking) return
      blinkOn = !blinkOn
      if (blinkOn) lightAll() else turnOff()
      main.postDelayed(this, 550)
    }
  }

  fun available(): Boolean = try {
    Class.forName("com.nothing.ketchum.GlyphManager")
    true
  } catch (e: Throwable) {
    false
  }

  fun set(state: String, zone: String): Boolean {
    if (!available()) return false
    main.post {
      stopBlink()
      if (state == "off") {
        shutdown()
        return@post
      }
      whenReady {
        when (state) {
          "blink" -> {
            blinking = true
            blinkOn = false
            main.post(blinkTick)
          }
          "talk" -> lightAll()
          "done", "test" -> lightZone(zone)
        }
      }
    }
    return true
  }

  private fun stopBlink() {
    blinking = false
    main.removeCallbacks(blinkTick)
  }

  private fun whenReady(action: () -> Unit) {
    if (ready) {
      action()
      return
    }
    pending = action
    if (connecting) return
    connecting = true
    try {
      val gmCls = Class.forName("com.nothing.ketchum.GlyphManager")
      val cbCls = Class.forName("com.nothing.ketchum.GlyphManager\$Callback")
      val manager = gmCls.getMethod("getInstance", Context::class.java).invoke(null, ctx)
      gm = manager
      val cb = Proxy.newProxyInstance(cbCls.classLoader, arrayOf(cbCls)) { _, method, _ ->
        if (method.name == "onServiceConnected") {
          main.post { onConnected() }
        } else if (method.name == "onServiceDisconnected") {
          main.post { ready = false; connecting = false }
        }
        null
      }
      gmCls.getMethod("init", cbCls).invoke(manager, cb)
    } catch (e: Throwable) {
      connecting = false
    }
  }

  private fun onConnected() {
    try {
      val g = gm ?: return
      val gmCls = g.javaClass
      val device = try {
        Class.forName("com.nothing.ketchum.Glyph").getField("DEVICE_24111").get(null) as String
      } catch (e: Throwable) {
        "24111"
      }
      gmCls.getMethod("register", String::class.java).invoke(g, device)
      gmCls.getMethod("openSession").invoke(g)
      ready = true
      connecting = false
      pending?.invoke()
      pending = null
    } catch (e: Throwable) {
      connecting = false
    }
  }

  private fun lightAll() = light((0..35).toList())

  private fun lightZone(zone: String) = light(
    when (zone) {
      "A" -> (20..30).toList()
      "B" -> (31..35).toList()
      else -> (0..19).toList()
    },
  )

  private fun light(indices: List<Int>) {
    try {
      val g = gm ?: return
      val builder = g.javaClass.getMethod("getGlyphFrameBuilder").invoke(g)
      val bCls = builder.javaClass
      val add = bCls.getMethod("buildChannel", Int::class.javaPrimitiveType)
      var b = builder
      for (i in indices) b = add.invoke(b, i)
      val frame = bCls.getMethod("build").invoke(b)
      val frameCls = Class.forName("com.nothing.ketchum.GlyphFrame")
      g.javaClass.getMethod("toggle", frameCls).invoke(g, frame)
    } catch (e: Throwable) {
      /* Glyph nicht verfügbar (z. B. App nicht im Vordergrund) */
    }
  }

  private fun turnOff() {
    try {
      val g = gm ?: return
      g.javaClass.getMethod("turnOff").invoke(g)
    } catch (e: Throwable) {
      /* egal */
    }
  }

  fun shutdown() {
    stopBlink()
    pending = null
    try {
      val g = gm
      if (g != null) {
        try { g.javaClass.getMethod("turnOff").invoke(g) } catch (e: Throwable) {}
        try { g.javaClass.getMethod("closeSession").invoke(g) } catch (e: Throwable) {}
        try { g.javaClass.getMethod("unInit").invoke(g) } catch (e: Throwable) {}
      }
    } finally {
      gm = null
      ready = false
      connecting = false
    }
  }
}
