package expo.modules.agentlive

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.drawable.Icon
import android.os.Build
import android.os.IBinder

class AgentLiveService : Service() {
  companion object {
    const val CHANNEL = "agent_live"
    const val ID = 4711
    @Volatile var listener: ((String) -> Unit)? = null
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val mode = intent?.getStringExtra("mode") ?: "stop"
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    try {
      when (mode) {
        "run", "approval", "hold" -> {
          ensureChannel(nm)
          val n = build(intent!!, mode)
          if (Build.VERSION.SDK_INT >= 34) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
          else startForeground(ID, n)
        }
        "finish" -> {
          val silent = intent?.getBooleanExtra("silent", true) ?: true
          if (silent) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            nm.cancel(ID)
          } else {
            ensureChannel(nm)
            val n = build(intent!!, "finish")
            stopForeground(STOP_FOREGROUND_DETACH)
            nm.notify(ID, n)
          }
          stopSelf()
        }
        else -> {
          stopForeground(STOP_FOREGROUND_REMOVE)
          nm.cancel(ID)
          stopSelf()
        }
      }
    } catch (e: Exception) {
      stopSelf()
    }
    return START_NOT_STICKY
  }

  private fun ensureChannel(nm: NotificationManager) {
    if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
      val ch = NotificationChannel(CHANNEL, "Agent-Status", NotificationManager.IMPORTANCE_DEFAULT)
      ch.description = "Zeigt live, woran der Agent gerade arbeitet"
      ch.setSound(null, null)
      ch.enableVibration(false)
      nm.createNotificationChannel(ch)
    }
  }

  private fun actionIntent(name: String, code: Int): PendingIntent {
    val i = Intent(this, AgentLiveReceiver::class.java)
    i.setPackage(packageName)
    i.putExtra("action", name)
    return PendingIntent.getBroadcast(this, code, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun build(intent: Intent, mode: String): Notification {
    val title = intent.getStringExtra("title") ?: "Tagesmanager"
    val text = intent.getStringExtra("text") ?: ""
    val step = intent.getIntExtra("step", 0)
    val max = intent.getIntExtra("max", 12).coerceAtLeast(1)
    val chip = intent.getStringExtra("chip") ?: ""

    val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, CHANNEL) else Notification.Builder(this)
    b.setSmallIcon(android.R.drawable.stat_notify_sync)
    b.setContentTitle(title)
    b.setContentText(text)
    b.setOnlyAlertOnce(true)
    b.setShowWhen(false)
    if (open != null) b.setContentIntent(open)

    if (mode == "finish") {
      b.setOngoing(false)
      b.setAutoCancel(true)
      return b.build()
    }

    b.setOngoing(true)
    if (mode == "hold") {
      // Glyph leuchtet noch: Dienst am Leben halten, damit die App als Vordergrund gilt
      b.setCategory(Notification.CATEGORY_STATUS)
      if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
      b.addAction(Notification.Action.Builder(null as Icon?, "Okay", actionIntent("dismiss", 4)).build())
      return b.build()
    }
    b.setCategory(Notification.CATEGORY_PROGRESS)
    if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)

    // Aktionen: Stopp, oder Ausführen/Abbrechen bei einer Rückfrage
    if (mode == "approval") {
      b.addAction(Notification.Action.Builder(null as Icon?, "Ausführen", actionIntent("approve", 1)).build())
      b.addAction(Notification.Action.Builder(null as Icon?, "Abbrechen", actionIntent("deny", 2)).build())
    } else {
      b.addAction(Notification.Action.Builder(null as Icon?, "Stopp", actionIntent("stop", 3)).build())
    }

    var styled = false
    if (Build.VERSION.SDK_INT >= 36) {
      styled = try { applyLiveUpdate(b, step, max, chip, mode == "approval") } catch (e: Throwable) { false }
    }
    if (!styled) b.setProgress(max, step.coerceIn(0, max), mode != "approval" && step == 0)
    return b.build()
  }

  /** Android 16: Notification.ProgressStyle + "Live Update"-Anfrage, per Reflexion, damit der Build nicht vom SDK abhängt. */
  private fun applyLiveUpdate(b: Notification.Builder, step: Int, max: Int, chip: String, waiting: Boolean): Boolean {
    val styleCls = Class.forName("android.app.Notification\$ProgressStyle")
    val segCls = Class.forName("android.app.Notification\$ProgressStyle\$Segment")
    val style = styleCls.getConstructor().newInstance()
    val seg = segCls.getConstructor(Int::class.javaPrimitiveType).newInstance(max)
    styleCls.getMethod("setProgressSegments", java.util.List::class.java).invoke(style, listOf(seg))
    styleCls.getMethod("setProgress", Int::class.javaPrimitiveType).invoke(style, step.coerceIn(0, max))
    styleCls.getMethod("setProgressIndeterminate", Boolean::class.javaPrimitiveType).invoke(style, step == 0 && !waiting)
    b.setStyle(style as Notification.Style)
    b.addExtras(android.os.Bundle().apply { putBoolean("android.requestPromotedOngoing", true) })
    try {
      Notification.Builder::class.java.getMethod("setShortCriticalText", CharSequence::class.java).invoke(b, chip)
    } catch (e: Throwable) {
      /* Chip nicht verfügbar, Rest funktioniert trotzdem */
    }
    return true
  }
}
