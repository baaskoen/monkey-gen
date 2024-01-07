let interval = null;
let intervalSpeed = 1000;

let height = 8;
let width = 10;

let posX = 0;
let posY = 0;
let appleX = 0;
let appleY = 0;

const MOVE_LEFT = 'move_left';
const MOVE_RIGHT = 'move_right';
const MOVE_UP = 'move_up';
const MOVE_DOWN = 'move_down';

let generations = [];
let currentGeneration = null;
let previousDecisions = [];

let items = {};
let killers = [];

let monkey = null;

$(document).ready(() => {
    init();
})

function init() {
    monkey = $('<img class="apple" src="monkey.png" width="40" />');
    let area = $('.area')

    for (i = 0; i < height * width; i++) {
        const y = Math.floor(i / width);
        const x = i - (y * width);

        let item = area.append(`<div class="area-item open m-1 pos_${x}_${y}" x="${x}" y="${y}"><div class="flex flex-wrap h-full w-full justify-center items-center inner"></div></div>`);
        if ((i + 1) % width === 0) {
            area.append('<br />');
        }

        items[`${x}_${y}`] = $(`.pos_${x}_${y}`);
    }

    refresh();

    $('.interval-input').change((e) => {
        intervalSpeed = e.target.value
        pause();
        start();
    })

    $('.button-start').click((e) => {
        start();
    })

     $('.button-pause').click((e) => {
        pause();
    })

    $('.button-reset').click((e) => {
        reset();
    })
}

function addGeneration() {
    currentGeneration = {
        id: uuid(),
        index: generations.length,
        score: 0,
        decisions: [],
        context: null,
        context_hash: null
    };
}

function simulate() {
    if (!currentGeneration) {
        addGeneration();
    }

    const previousDistance = getDistanceToApple();
    const decision = makeDecision();
    previousDecisions.push(decision);
    actOnDecision(decision);

    const currentItem = getItemAt(posX, posY);

    if (isKillerAt(posX, posY)) {
        decision.score = 0
        currentGeneration.decisions.push(decision);
        die();
        $('.indicator-last-consequence').text('DEATH')
        return;
    }

    const currentDistance = getDistanceToApple()

    if (currentDistance < previousDistance) {
        decision.score = 100
    }

    if (currentDistance === previousDistance) {
        decision.score = 50
    }

    if (currentDistance > previousDistance) {
        decision.score = 0;
    }

    $('.indicator-last-consequence').text(currentDistance < previousDistance ? 'GOOD' : 'MEH')
    currentGeneration.decisions.push(decision);

    if (currentDistance === 0) {
        $('.indicator-last-consequence').text('WIN')
        win();
    }
}

function makeDecision() {
    const availableDecisionIds = getAvailableDecisionIds();
    const sortedGenerations = getSortedGenerations().filter(g => g.score > 0);

    let decisionId = null;

    const context = {
        posX: posX,
        posY: posY,
        appleX: appleX,
        appleY: appleY,
        killerTop: isKillerAt(posX, posY - 1),
        killerRight: isKillerAt(posX + 1, posY),
        killerBottom: isKillerAt(posX, posY + 1),
        killerLeft: isKillerAt(posX - 1, posY)
    }

    const contextHash = md5(JSON.stringify(context));

    let previousBestDecision = null;

    sortedGenerations.forEach((g) => {
        const d = g.decisions.find(d => d.context_hash === contextHash && d.score === 100);
        if (d) {
            previousBestDecision = d;
            return false;
        }

        const n = g.decisions.find(d => d.context_hash === contextHash && d.score === 50);

        if (n && Math.random() < 0.8) {
            previousBestDecision = n;
            return false;
        }
    })

    const getRandomDecision = () => availableDecisionIds[getRandomInt(0, availableDecisionIds.length - 1)];

    if (previousBestDecision) {
        decisionId = previousBestDecision.decision_id
    } else {
        decisionId = getRandomDecision()
    }

    if (previousDecisions.find(d => d.context_hash === contextHash && d.decision_id === decisionId)) {
        decisionId = getRandomDecision()
    }

    return {
        decision_id: decisionId,
        score: 0,
        context: context,
        context_hash: contextHash
    }
}

function putAtStart() {
    moveToPosition(0, 0)
}

function putAppleAtRandomPosition() {
    const x = getRandomInt(0, 9);
    const y = getRandomInt(0, 7);

    appleX = x;
    appleY = y;
    $('.apple').remove();
    getItemAt(x, y).find('.inner').append('<img class="apple" src="apple.png" width="40" />')
}

function putKillerAt(x, y) {
    getItemAt(x, y).find('.inner').append('<img class="killer" src="killer.png" width="40" />')
    killers.push(`${x}_${y}`)
}

function removeKillers() {
    killers = [];
    $('.killer').remove();
}

function putKillersAtRandomPositions(amount = 1) {
    for (i = 0; i < amount; i++) {
        const x = getRandomInt(0, 9);
        const y = getRandomInt(0, 7);

        if (isKillerAt(x, y) || (x === 9 && y === 3) || (x === 0 && y === 0) || (x === appleX || y == appleY)) {
            continue;
        }

        putKillerAt(x,y);

    }
}

function getItemAt(x, y) {
    return items[`${x}_${y}`]
}

function isKillerAt(x, y) {
    return killers.includes(`${x}_${y}`) 
}

function moveLeft() {
    moveToPosition(posX - 1, posY);
}

function moveRight() {
    moveToPosition(posX + 1, posY);
}

function moveDown() {
    moveToPosition(posX, posY + 1);
}

function moveUp() {
    moveToPosition(posX, posY - 1);
}

function start() {
    if (interval) {
        clearInterval(interval);
    }

    interval = setInterval(() => {
        simulate();
    }, intervalSpeed)
}

function pause() {
    if (!interval) {
        return;
    }

    clearInterval(interval);
}

function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function moveToPosition(x, y) {
    if (x < 0 || x > width - 1 || y < 0 || y > height - 1) {
        console.log(`cant move to [${x}, ${y}] man`)
        return;
    }

    getItemAt(posX, posY).removeClass('closed').addClass('open')

    posX = x;
    posY = y;
    const currentSpot = getItemAt(x, y);

    currentSpot.removeClass('open').addClass('closed')
    currentSpot.find('.inner').append(monkey)
    updateDistanceToAppleText();
}

function getDistanceToApple()
{
    return Math.abs(posX - appleX) + Math.abs(posY - appleY);
}

function uuid() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function updateDistanceToAppleText()
{
    const xDiff = Math.abs(posX - appleX);
    const yDiff = Math.abs(posY - appleY);
    const totalDiff = getDistanceToApple();

    $('.indicator-distance-to-apple').text(`${totalDiff} [${xDiff}, ${yDiff}]`)
}

function getSortedGenerations() {
    return [...generations].sort((a, b) => b.score - a.score);
}

function actOnDecision(decision) {
    if (decision.decision_id === MOVE_LEFT) {
        moveLeft();
    }

    if (decision.decision_id === MOVE_RIGHT) {
        moveRight();
    }

    if (decision.decision_id === MOVE_DOWN) {
        moveDown();
    }

    if (decision.decision_id === MOVE_UP) {
        moveUp();
    }
}

function getAvailableDecisionIds() {
    let ids = [];

    if (posX > 0) {
        ids.push(MOVE_LEFT);
    }

    if (posX < width - 1) {
        ids.push(MOVE_RIGHT);
    }

    if (posY > 0) {
        ids.push(MOVE_UP);
    }

    if (posY < height - 1) {
        ids.push(MOVE_DOWN)
    }

    return ids;
}

function win() {
    currentGeneration.score = Math.max(1000 - previousDecisions.length, 10);
    generations.push(currentGeneration);
    $('.indicator-generation').text(generations.length)
    goNext();
}

function die() {
    currentGeneration.score = 0;
    goNext();
}

function goNext() {
    refresh();
}

function refresh()
{
    currentGeneration = null;
    previousDecisions = [];
    putAtStart();
    removeKillers();
    putAppleAtRandomPosition();
    putKillersAtRandomPositions(10)
}

function reset() {
    if (!interval) {
        return;
    }

    clearInterval(interval);
    generations = [];
    $('.indicator-generation').text('-')
    $('.indicator-best-generation').text('-')
    goNext();
}