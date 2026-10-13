import { logger } from "@vendetta";
import { storage } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";
import { FluxDispatcher, React } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";

storage.inputVolume ??= 100;
storage.outputVolume ??= 100;
storage.autoReapply ??= true;

function trySetInput(v: number) {
  try {
    FluxDispatcher.dispatch({ type: "AUDIO_SET_INPUT_VOLUME", volume: v });
  } catch (e) { logger.log("Flux input başarısız:", e); }
  try {
    const m: any = findByProps("setInputVolume", "getInputVolume");
    if (m?.setInputVolume) m.setInputVolume(v);
  } catch {}
}

function trySetOutput(v: number) {
  try {
    FluxDispatcher.dispatch({ type: "AUDIO_SET_OUTPUT_VOLUME", volume: v });
  } catch (e) { logger.log("Flux output başarısız:", e); }
  try {
    const m: any = findByProps("setOutputVolume", "getOutputVolume");
    if (m?.setOutputVolume) m.setOutputVolume(v);
  } catch {}
}

function applyAll() {
  const inp = Number(storage.inputVolume ?? 100);
  const out = Number(storage.outputVolume ?? 100);
  trySetInput(inp);
  trySetOutput(out);
}

let unsub: (() => void) | undefined;

export default {
  onLoad: () => {
    applyAll();
    try {
      const sub = () => setTimeout(applyAll, 500);
      FluxDispatcher.subscribe("VOICE_CHANNEL_SELECT", sub);
      unsub = () => FluxDispatcher.unsubscribe("VOICE_CHANNEL_SELECT", sub);
    } catch {}
  },
  onUnload: () => {
    try { unsub?.(); } catch {}
    trySetInput(100);
    trySetOutput(100);
  },
  settings: () => {
    useProxy(storage);
    const F: any = Forms as any;
    return (
      <F.FormSection title="Mikrofon Sesi">
        <F.FormSliderRow
          label="Mikrofon seviyesi"
          value={Number(storage.inputVolume ?? 100)}
          minimum={0} maximum={200} step={1}
          onValueChange={(v: number) => {
            storage.inputVolume = Math.round(v);
            trySetInput(Math.round(v));
          }}
        />
        <F.FormSliderRow
          label="Hoparlör seviyesi"
          value={Number(storage.outputVolume ?? 100)}
          minimum={0} maximum={200} step={1}
          onValueChange={(v: number) => {
            storage.outputVolume = Math.round(v);
            trySetOutput(Math.round(v));
          }}
        />
        <F.FormSwitchRow
          label="Kanala girince otomatik uygula"
          value={Boolean(storage.autoReapply ?? true)}
          onValueChange={(v: boolean) => { storage.autoReapply = v; }}
        />
        <F.FormRow
          label="Sıfırla"
          subLabel={`Şu an: mic %${storage.inputVolume} / out %${storage.outputVolume}`}
          onPress={() => {
            storage.inputVolume = 100;
            storage.outputVolume = 100;
            applyAll();
          }}
        />
      </F.FormSection>
    );
  },
};
