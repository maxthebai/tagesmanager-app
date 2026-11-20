package expo.modules.agentglyph

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Nothing Glyph (Phone (3a) / (3a) Pro, DEVICE_24111) für den Agenten-Status.
 * Das Glyph-SDK wird per Reflexion angesprochen: fehlt es, passiert einfach nichts.
 */
class AgentGlyphModule : Module() {
  private var controller: GlyphController? = null

  private fun ctl(): GlyphController? {
    val c = appContext.reactContext?.applicationContext ?: return null
    if (controller == null) controller = GlyphController(c)
    return controller
  }

  override fun definition() = ModuleDefinition {
    Name("AgentGlyph")

    Function("isAvailable") { ctl()?.available() ?: false }

    // state: "off" | "blink" | "talk" | "done" | "test"; zone: "A" | "B" | "C" (für done und test)
    Function("setState") { state: String, zone: String ->
      try {
        ctl()?.set(state, zone) ?: false
      } catch (e: Throwable) {
        false
      }
    }

    OnDestroy { controller?.shutdown() }
  }
}
