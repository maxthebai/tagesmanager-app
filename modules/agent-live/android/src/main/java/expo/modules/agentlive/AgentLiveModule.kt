package expo.modules.agentlive

import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Zeigt den Agenten-Status als laufende Benachrichtigung (Android 16: Live Update mit Fortschrittsleiste)
 * und hält den Lauf per Vordergrunddienst am Leben, solange die App im Hintergrund ist.
 */
class AgentLiveModule : Module() {
  private fun ctx(): Context? = appContext.reactContext?.applicationContext

  override fun definition() = ModuleDefinition {
    Name("AgentLive")
    Events("onAction")

    OnCreate {
      AgentLiveService.listener = { action -> sendEvent("onAction", mapOf("action" to action)) }
    }
    OnDestroy {
      AgentLiveService.listener = null
    }

    // mode: "run" | "approval" | "finish" | "stop"
    Function("update") { mode: String, title: String, text: String, step: Int, max: Int, chip: String, silentFinish: Boolean ->
      val c = ctx() ?: return@Function false
      try {
        val i = Intent(c, AgentLiveService::class.java)
        i.putExtra("mode", mode)
        i.putExtra("title", title)
        i.putExtra("text", text)
        i.putExtra("step", step)
        i.putExtra("max", max)
        i.putExtra("chip", chip)
        i.putExtra("silent", silentFinish)
        if (Build.VERSION.SDK_INT >= 26 && (mode == "run" || mode == "approval")) c.startForegroundService(i) else c.startService(i)
        true
      } catch (e: Exception) {
        false
      }
    }
  }
}
