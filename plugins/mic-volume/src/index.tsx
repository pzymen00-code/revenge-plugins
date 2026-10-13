import { logger } from "@vendetta";
import { storage } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";
import { FluxDispatcher, React } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";

storage.inputVolume ??= 100;
storage.outputVolume ??= 100;
storage.autoReapply ??= true;

const diag: any = {
  inputApi: "henüz bakılmadı",
  inputNow: "?",
  outputApi: "henüz bakılmadı",
  outputNow: "?",
};

function detect() {
  try {
    const m: any = findByProps("setInputVolume", "getInputVolume");
    if (m?.setInputVolume) {
      diag.inputApi = "bulundu";
      try {
        const v = m.getInputVolume?.();
        diag.inputNow = v === undefined ? "okunamadı" : String(v);
      } catch { diag.inputNow = "okunamadı"; }
    } else {
      diag.inputApi = "bulunamadı";
    }
  } catch { diag.inputApi = "hata"; }
  try {
    const m: any = findByProps("setOutputVolume", "getOutputVolume");
    if (m?.setOutputVolume) {
      diag.outputApi = "bulundu";
      try {
        const v = m.getOutputVolume?.();
        diag.outputNow = v === undefined ? "okunamadı" : String(v);
      } catch { diag.outputNow = "okunamadı"; }
    } else {
      diag.outputApi = "bulunamadı";
    }
  } catch { diag.outputApi = "hata"; }
}

function trySetInput(v: number) {
  try {
    FluxDispatcher.dispatch({ type: "AUDIO_SET_INPUT_VOLUME", volume: v });
  } catch (e) {
    logger.log("Flux input başarısız:", e);
  }
  try {
    const m: any = findByProps("setInputVolume", "getInputVolume");
    if (m?.setInputVolume) m.setInputVolume(v);
  } catch {}
  try {
    const m: any = findByProps("setInputVolume");
    if (m && typeof m.setInputVolume === "function" && !m.getInputVolume) {
      m.setInputVolume(v);
    }
  } catch {}
  detect();
}

function trySetOutput(v: number) {
  try {
    FluxDispatcher.dispatch({ type: "AUDIO_SET_OUTPUT_VOLUME", volume: v });
  } catch (e) {
    logger.log("Flux output başarısız:", e);
  }
  try {
    const m: any = findByProps("setOutputVolume", "getOutputVolume");
    if (m?.setOutputVolume) m.setOutputVolume(v);
  } catch {}
  detect();
}

function applyAll() {
  trySetInput(Number(storage.inputVolume ?? 100));
  trySetOutput(Number(storage.outputVolume ?? 100));
}

let unsub: (() => void) | undefined;

export default {
  onLoad: () => {
    detect();
    applyAll();
    try {
      const sub = () => {
        if (storage.autoReapply) setTimeout(applyAll, 500);
      };
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
    const [mic, setMic] = React.useState(Number(storage.inputVolume ?? 100));
    const [out, setOut] = React.useState(Number(storage.outputVolume ?? 100));
    return (
      <>
        <F.FormSection title="Mikrofon Sesi">
          <F.FormSliderRow
            label={`Mikrofon seviyesi (%${mic})`}
            value={mic}
            minimum={0}
            maximum={200}
            step={1}
            onValueChange={(v: number) => {
              const r = Math.round(v);
              setMic(r);
              storage.inputVolume = r;
              trySetInput(r);
            }}
          />
          <F.FormSliderRow
            label={`Hoparlör seviyesi (%${out})`}
            value={out}
            minimum={0}
            maximum={200}
            step={1}
            onValueChange={(v: number) => {
              const r = Math.round(v);
              setOut(r);
              storage.outputVolume = r;
              trySetOutput(r);
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
              setMic(100);
              setOut(100);
              applyAll();
            }}
          />
        </F.FormSection>
        <F.FormSection title="Tanı">
          <F.FormRow
            label="Mikrofon API"
            subLabel={`${diag.inputApi} / anlık değer: ${diag.inputNow}`}
          />
          <F.FormRow
            label="Hoparlör API"
            subLabel={`${diag.outputApi} / anlık değer: ${diag.outputNow}`}
          />
        </F.FormSection>
      </>
    );
  },
};
