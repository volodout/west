import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Отвечает является ли карта уткой.
function isDuck(card) {
    return card instanceof Duck;
}

// Отвечает является ли карта собакой.
function isDog(card) {
    return card instanceof Dog;
}

// Дает описание существа по схожести с утками и собаками
function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) {
        return 'Утка-Собака';
    }
    if (isDuck(card)) {
        return 'Утка';
    }
    if (isDog(card)) {
        return 'Собака';
    }
    return 'Существо';
}

class Creature extends Card {
  constructor(name, maxPower, image) {
    super(name, maxPower, image);
  }

  getDescriptions() {
    return [getCreatureDescription(this), ...super.getDescriptions()];
  }
}

// Основа для утки.
class Duck extends Creature {
  constructor(name='Мирная утка', maxPower=2) {
    super(name, maxPower);
    // this.quacks = function () { console.log('quack') };
    // this.swims = function () { console.log('float: both;') };
  }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}


// Основа для собаки.
class Dog extends Creature {
  constructor(name='Пес-бандит', maxPower=3) {
    super(name, maxPower);
  }
}

class Gatling extends Creature {
  constructor(name='Гатлинг', maxPower=6) {
    super(name, maxPower);
  }

  attack(gameContext, continuation) {
    const taskQueue = new TaskQueue();
    taskQueue.push(onDone => this.view.showAttack(onDone));

    const enemyCards = gameContext.oppositePlayer.table;
    enemyCards.forEach(card => {
      taskQueue.push(onDone => {
        this.dealDamageToCreature(2, card, gameContext, onDone);
      });
    });

    taskQueue.continueWith(continuation);
  }
}


class Trasher extends Dog {
    constructor() {
        super('Громила', 5);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            super.modifyTakenDamage(Math.max(0, value - 1), fromCard, gameContext, continuation);
        });
    }

    getDescriptions() {
        return [
            'Получает на 1 меньше урона при атаке.',
            ...super.getDescriptions()
        ];
    }
}

export default Trasher;

const seriffStartDeck = [
  new Duck(),
  new Duck(),
  new Duck(),
  new Gatling(),
];
const banditStartDeck = [
  new Trasher(),
  new Dog(),
  new Dog(),
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
