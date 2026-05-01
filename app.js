import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

// const firebaseConfig = {
//   apiKey: "REPLACE_WITH_TEST_DU8_PROJECT_API_KEY",
//   authDomain: "REPLACE_WITH_TEST_DU8_PROJECT_AUTH_DOMAIN",
//   databaseURL: "https://testhtn-23965-default-rtdb.firebaseio.com",
//   projectId: "REPLACE_WITH_TEST_DU8_PROJECT_ID",
//   appId: "REPLACE_WITH_TEST_DU8_PROJECT_APP_ID"
// };

const firebaseConfig = {
  apiKey: "AIzaSyDPho5YYOLz2Qg5UIhS3ebiSNxwDuABVlo",
  authDomain: "testhtn-23965.firebaseapp.com",
  databaseURL: "https://testhtn-23965-default-rtdb.firebaseio.com",
  projectId: "testhtn-23965",
  storageBucket: "testhtn-23965.firebasestorage.app",
  messagingSenderId: "1046387453188",
  appId: "1:1046387453188:web:1b2b83f03cac3ffc9b7451"
};

const FLAME_AO_THRESHOLD = 2500;
const STATE_PATH = "sensor_logs/latest";
const COMMAND_PATH = "commands";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const userInfo = document.getElementById("userInfo");
const commandStatus = document.getElementById("commandStatus");

const els = {
  mode: document.getElementById("systemMode"),
  fireState: document.getElementById("fireState"),
  temperature: document.getElementById("temperature"),
  humidity: document.getElementById("humidity"),
  mq2: document.getElementById("mq2"),
  flameAo: document.getElementById("flameAo"),
  buzzer: document.getElementById("buzzer"),
  pump: document.getElementById("pump"),
  rgb: document.getElementById("rgb"),
  manualBtn: document.getElementById("manualBtn"),
  resetBtn: document.getElementById("resetBtn"),
  servoAngle: document.getElementById("servoAngle"),
  updatedAt: document.getElementById("updatedAt")
};

function buildStatePatchFromCommand(cmd, cmdId, ts) {
  const patch = {
    updatedAt: ts,
    lastCommandId: cmdId,
    lastCommandSource: "web-dashboard"
  };

  if (typeof cmd.pump === "boolean") {
    patch.pump = cmd.pump;
  }

  if (typeof cmd.buzzer === "boolean") {
    patch.buzzer = cmd.buzzer;
  }

  if (typeof cmd.manualAlarm === "boolean") {
    patch.manualBtn = cmd.manualAlarm;
  }

  if (typeof cmd.resetAlarm === "boolean") {
    patch.resetBtn = cmd.resetAlarm;
  }

  return patch;
}

function setOnOff(el, val) {
  el.textContent = val ? "ON" : "OFF";
  el.className = "metric-value " + (val ? "ok" : "bad");
}

function renderFireState(flameAo) {
  const fire = Number(flameAo) <= FLAME_AO_THRESHOLD;
  els.fireState.textContent = fire ? "FIRE" : "SAFE";
  els.fireState.className = "metric-value " + (fire ? "bad" : "ok");
}

function renderState(data) {
  if (!data) return;

  const mode = data.mode || (data.fullAlarm ? "ALARM" : data.warning ? "WARN" : data.manual ? "MANUAL" : data.reset ? "RESET" : "SAFE");
  els.mode.textContent = mode;
  els.mode.className = "status-box " + mode;

  els.temperature.textContent = `${data.tempC ?? 0} C`;
  els.humidity.textContent = `${data.humi ?? 0} %`;
  els.mq2.textContent = `${data.mq2AO ?? 0}`;
  els.flameAo.textContent = `${data.flameAO ?? 0}`;
  els.servoAngle.textContent = `${data.servoAngle ?? 0} deg`;
  els.updatedAt.textContent = `updatedAt: ${data.updatedAt ?? data.millis ?? 0}`;

  renderFireState(data.flameAO ?? 0);
  setOnOff(els.buzzer, data.buzzer);
  setOnOff(els.pump, data.pump);
  setOnOff(els.rgb, data.rgb ?? false);
  setOnOff(els.manualBtn, data.manual ?? data.manualBtn ?? false);
  setOnOff(els.resetBtn, data.reset ?? data.resetBtn ?? false);
}

async function writeCommands(obj) {
  try {
    const ts = Date.now();
    const cmdId = `cmd_${ts}`;
    const commandPayload = {
      ...obj,
      cmdId,
      sentAt: ts,
      source: "web-dashboard"
    };

    const statePatch = buildStatePatchFromCommand(obj, cmdId, ts);
    await update(ref(db), {
      [COMMAND_PATH]: commandPayload,
      [STATE_PATH]: statePatch
    });

    if (commandStatus) {
      commandStatus.textContent = `Command test: da gui len ${COMMAND_PATH} (cmdId: ${cmdId})`;
      commandStatus.className = "footer-note ok";
    }
  } catch (err) {
    if (commandStatus) {
      commandStatus.textContent = `Command test: loi gui lenh - ${err.message}`;
      commandStatus.className = "footer-note bad";
    }
    alert("Ghi lenh that bai: " + err.message);
  }
}

document.getElementById("pumpOnBtn").onclick = () => writeCommands({ pump: true });
document.getElementById("pumpOffBtn").onclick = () => writeCommands({ pump: false });
document.getElementById("buzzerOnBtn").onclick = () => writeCommands({ buzzer: true });
document.getElementById("buzzerOffBtn").onclick = () => writeCommands({ buzzer: false });
document.getElementById("manualOnBtn").onclick = () => writeCommands({ manualAlarm: true });
document.getElementById("manualOffBtn").onclick = () => writeCommands({ manualAlarm: false });

document.getElementById("resetBtnCmd").onclick = async () => {
  await writeCommands({ resetAlarm: true });
  setTimeout(() => {
    writeCommands({ resetAlarm: false });
  }, 1000);
};

userInfo.textContent = "Public mode";

const stateRef = ref(db, STATE_PATH);
onValue(stateRef, (snapshot) => {
  renderState(snapshot.val());
});
