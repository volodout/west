import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Отвечает является ли карта уткой.
function isDuck(card) {
  return card && card.quacks && card.swims;
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

  get currentPower() {
    return this._currentPower;
  }

  set currentPower(value) {
    return this._currentPower = value > this.maxPower ? this.maxPower : value;
  }

  getDescriptions() {
    return [getCreatureDescription(this), ...super.getDescriptions()];
  }
}

// Основа для утки.
class Duck extends Creature {
  constructor(name='Мирная утка', maxPower=1) {
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

class Brewer extends Duck {
  constructor() {
    super('Пивовар', 2);
  }

  attack(gameContext, continuation) {
    const taskQueue = new TaskQueue();
    taskQueue.push(onDone => this.view.showAttack(onDone));
    const allCards = gameContext.currentPlayer.table.concat(gameContext.oppositePlayer.table);
    allCards.forEach(card => {
      if (isDuck(card)) {
        taskQueue.push(onDone => {
          card.maxPower += 1;
          card.currentPower += 2;
          card.updateView();
          card.view.signalHeal(onDone);
        });
      }
    });
    taskQueue.continueWith(continuation);
  }
}

class Lad extends Dog {
  constructor(name = 'Браток', maxPower = 2) {
    super(name, maxPower);
  }

  static getInGameCount() {
    return this.inGameCount || 0;
  }

  static setInGameCount(value) {
    this.inGameCount = value;
  }

    static getBonus() {
        const count = this.getInGameCount();
        if (count <= 1) {
            return 0;
        }
        return (count * (count + 1)) / 2;
    }

  doAfterComingIntoPlay(gameContext, continuation) {
    Lad.setInGameCount(Lad.getInGameCount() + 1);
    continuation();
  }

  doBeforeRemoving(continuation) {
    Lad.setInGameCount(Lad.getInGameCount() - 1);
    if (continuation) {
      continuation();
    }
  }

  modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
    this.view.signalAbility(() => {
      super.modifyDealedDamageToCreature(value + Lad.getBonus(), toCard, gameContext, continuation);
    });
  }

  modifyTakenDamage(value, fromCard, gameContext, continuation) {
    this.view.signalAbility(() => {
      const reducedDamage = Math.max(1, value - Lad.getBonus());
      super.modifyTakenDamage(reducedDamage, fromCard, gameContext, () => {
        if (this.currentPower <= 0) {
          this.doBeforeRemoving(() => {
            gameContext.currentPlayer.table = gameContext.currentPlayer.table.filter(card => card !== this);
            if (continuation) {
              continuation();
            }
          });
        } else {
          continuation();
        }
      });
    });
  }

  getDescriptions() {
    const descriptions = super.getDescriptions();
    if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') || Lad.prototype.hasOwnProperty('modifyTakenDamage')) {
      return ['Чем их больше, тем они сильнее.', ...descriptions];
    }
    return descriptions;
  }
}

class Rogue extends Creature {
    constructor(name = 'Изгой', maxPower = 2) {
        super(name, maxPower);
    }

    beforeAttack(gameContext, continuation) {
        const target = gameContext.oppositePlayer.table[gameContext.position];
        if (target) {
            const targetPrototype = Object.getPrototypeOf(target);

            // Выбираем методы, которые надо украсть
            const abilities = [
                'modifyDealedDamageToCreature',
                'modifyDealedDamageToPlayer',
                'modifyTakenDamage'
            ];

            // Проверяем, что у цели есть эти методы и она не уже Изгой
            if (targetPrototype !== Creature.prototype) {
                abilities.forEach(ability => {
                    if (targetPrototype.hasOwnProperty(ability)) {
                        this[ability] = targetPrototype[ability];
                        delete targetPrototype[ability];
                    }
                });
            }

            // Обновляем отображение
            gameContext.updateView();
        }
        continuation();
    }

    getDescriptions() {
        return [
            'Перед атакой забирает у цели способности уменьшения получаемого или увеличения наносимого урона.',
            ...super.getDescriptions()
        ];
    }
}

class Nemo extends Creature {
    constructor(name = 'Немо', maxPower = 4) {
        super(name, maxPower);
        this.hasStolen = false;
    }

    doBeforeAttack(gameContext, continuation) {
        const { oppositePlayer, position, updateView } = gameContext;
        const targetCard = oppositePlayer.table[position];

        if (targetCard && !this.hasStolen) {
            const stolenPrototype = Object.getPrototypeOf(targetCard);
            const currentPrototype = Object.getPrototypeOf(this);
            Object.setPrototypeOf(this, stolenPrototype);
            Object.setPrototypeOf(targetCard, currentPrototype);
            this.hasStolen = true;

            if (typeof stolenPrototype.doBeforeAttack === 'function') {
                stolenPrototype.doBeforeAttack.call(this, gameContext, () => {
                    updateView();
                    continuation();
                });
                return;
            }
        }
        updateView();
        continuation();
    }
}


class PseudoDuck extends Dog {
  constructor() {
    super('Псевдоутка', 3);
    this.quacks = function() { console.log('quack'); };
    this.swims = function() { console.log('float: both;'); };
  }
}

const seriffStartDeck = [
  new Duck(),
  new Duck(),
  new Duck(),
];
const banditStartDeck = [
  new Lad(),
  new Lad(),
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
