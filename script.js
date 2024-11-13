const infoEl = document.getElementById("info");
const resultEl = document.getElementById("result");

const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("score");
const counterInfoEl = document.getElementById("counter-info");
const counterResultEl = document.getElementById("counter-result");

const params = (new URL(document.location)).searchParams;
const channel = params.get("channel") || null;
const defaultTime = parseInt(params.get("time")) || 60;

let timer = null;
let state = 0; // 0 - ожидание, 1 - голосование, 2 - результаты
let timerValue = 0;
let users = [];
let pollResults = {}; // Объект для подсчета количества ответов

function messageHandler(user, message) {
    if (state !== 1) { return; }
    if (users.includes(user)) { return; }

    message = message.replace("  "," ").replace(/[\uD800-\uDFFF]/gi, []).trim();
    message = message.trim().replace(",", ".");

    if (isNaN(message)) { return; }

    message = parseInt(message, 10);
    if (message < 1 || message > 10) { return; }

    // Увеличиваем счетчик для каждого числа
    pollResults[message] = (pollResults[message] || 0) + 1;
    users.push(user);
    counterInfoEl.innerText = users.length;
}

function init() {
    ComfyJS.onChat = ( user, message, flags, self, extra ) => {
        messageHandler(user, message);
    };

    ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
        if (flags.broadcaster || flags.mod || user === "declider") {
            if (command === "оценка") {
                if (state === 0) {
                    let time = message.split(" ")[0];
                    if (time.endsWith("m") || time.endsWith("м")) {
                        time = parseInt(time.slice(0, -1)) * 60;
                    } else {
                        time = parseInt(time);
                    }
                    if (!isNaN(time) && time > 0) {
                        start(time);
                    } else {
                        start(defaultTime);
                    }
                } else if (state === 1) {
                    finish();
                } else if (state === 2) {
                    stop();
                }
            }
        }
    };

    ComfyJS.Init(channel);
}

function start(time) {
    timer && (typeof timer === 'number' ? clearTimeout(timer) : clearInterval(timer));
    counterInfoEl.innerText = "0";
    timerValue = time;
    pollResults = {}; // Очищаем результаты опроса
    users = []; // Очищаем список пользователей
    timer = setInterval(onTimer, 1000);
    infoEl.style.opacity = 1;
    state = 1;
    timerToTime();
}

function finish() {
    timer && (typeof timer === 'number' ? clearTimeout(timer) : clearInterval(timer));

    // Находим самый частый ответ
    let mostFrequent = null;
    let highestCount = 0;
    for (let [key, count] of Object.entries(pollResults)) {
        if (count > highestCount) {
            mostFrequent = key;
            highestCount = count;
        }
    }

    if (mostFrequent) {
        scoreEl.textContent = `Самый частый ответ: ${mostFrequent}`;
    } else {
        scoreEl.textContent = `Нет ответов`;
    }

    counterResultEl.textContent = users.length;
    
    infoEl.style.opacity = 0;
    resultEl.style.opacity = 1;

    state = 2;
    timer = setTimeout(stop, 10000);
}

function stop() {
    timer && (typeof timer === 'number' ? clearTimeout(timer) : clearInterval(timer));
    resultEl.style.opacity = 0;
    state = 0;
}

function onTimer() {
    timerValue -= 1;

    if (timerValue > 0) {
        timerToTime();
    } else {
        finish();
    }
}

function timerToTime() {
    let minutes = Math.floor(timerValue / 60);
    let seconds = timerValue % 60;

    minutes = minutes.toString().padStart(2, "0");
    seconds = seconds.toString().padStart(2, "0");

    let text = `${minutes}:${seconds}`;
    timerEl.innerText = text;
}

window.onload = () => {
    if ( channel ) {
        init();
    } else {
        document.body.textContent = "НЕ УКАЗАН ТВИЧ КАНАЛ (в ссылке добавить ?channel=КАНАЛ)";
        document.body.style.backgroundColor = "black";
    }
}
