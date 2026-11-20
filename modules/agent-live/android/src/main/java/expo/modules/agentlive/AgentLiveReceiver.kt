package expo.modules.agentlive

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Nimmt Tipps auf die Buttons der Benachrichtigung entgegen und gibt sie an die App weiter. */
class AgentLiveReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.getStringExtra("action") ?: return
    AgentLiveService.listener?.invoke(action)
  }
}
