'use strict'

const { Test, assert } = require('@ndk/test')
const { EventEmitter, PromiseEventEmitter } = require('@ndk/fn/events')


exports['@ndk/fn/events'] = class FnEventsTest extends Test {

  /** Попытка удаление события до подписки не должна падать */
  ['EventEmitter - удаление события до подписки']() {
    const em = new EventEmitter()
    const fn = () => em.delete('test', fn)

    assert.doesNotThrow(fn)
  }

  /** После отписки от последнего события сет со слушателями удаляется.
   * На данное поведение опирается метод "has" */
  ['EventEmitter - удаление события после удаления последнего слушателя']() {
    const em = new EventEmitter()
    const fn1 = () => em.delete('test', fn1)
    const fn2 = () => em.delete('test', fn2)

    em.on('test', fn1)
      .on('test', fn2)

    assert.doesNotThrow(fn1)
    assert(em.has('test') === true)
    assert.doesNotThrow(fn2)
    assert(em.has('test') === false)
  }

  /** emit не должен ничего возвращать, ни чейнится */
  async ['EventEmitter - emit не возвращает результат']() {
    const em = new EventEmitter()
    let value = 0

    em.on('test', () => value++)

    const p = em.emit('test')
    const result = await p

    assert(p instanceof Promise)
    assert(result === undefined)
    assert.equal(value, 1)
  }

  /** once - аналогичен базовому во встроенном модуле events,
   * но работает только с Promise */
  async ['EventEmitter - once']() {
    const em = new EventEmitter()
    const p = new Promise(resolve => setTimeout(() => {
      em.emit('test', 1, 12)
      setTimeout(() => {
        resolve(2)
      }, 1)
    }, 1))
    const [result1, result12] = await em.once('test')
    const result2 = await p

    assert.equal(result1, 1)
    assert.equal(result12, 12)
    assert.equal(result2, 2)
    assert(!(em.has('test')))
  }

  /** on и once можно использовать вместе, при этом события из on не очищаются */
  async ['EventEmitter - on + once']() {
    let result = 0
    const em = new EventEmitter()
    const p = new Promise(resolve => setTimeout(() => {
      em.emit('test', 1)
      setTimeout(() => {
        resolve(2)
      }, 1)
    }, 1))

    em.on('test', value => {
      result += value
    })

    const [result1] = await em.once('test')
    const result2 = await p

    assert.equal(result1, 1)
    assert.equal(result2, 2)
    assert(em.has('test'))
    assert.equal(result, 1)
    em.emit('test', 1)
    assert.equal(result, 2)
  }

  /** PEE должен соответствовать поведению Promise */
  async ['PromiseEventEmitter - equal Promise']() {
    let result1 = null
    let result2 = null
    let result3 = null
    let result4 = null

    result1 = await new Promise(resolve => resolve('test1'))
    result2 = await new PromiseEventEmitter(emitter => emitter.resolve('test1'))
    assert(result1 === result2 && result2 === 'test1')

    try {
      await new Promise((resolve, reject) => reject(new Error('test2')))
    } catch (error) {
      result1 = error.message
    }
    try {
      await new PromiseEventEmitter(emitter => emitter.reject(new Error('test2')))
    } catch (error) {
      result2 = error.message
    }
    assert(result1 === result2 && result2 === 'test2')

    try {
      await new Promise(() => this.test3())
    } catch (error) {
      result1 = error.message
    }
    try {
      await new PromiseEventEmitter(() => this.test3())
    } catch (error) {
      result2 = error.message
    }
    assert(result1 === result2 && result2 === 'this.test3 is not a function')

    result1 = await (new Promise(() => this.test4())).catch(reason => reason.message)
    result2 = await (new PromiseEventEmitter(() => this.test4())).catch(reason => reason.message)
    assert(result1 === result2 && result2 === 'this.test4 is not a function')

    result1 = await (new Promise(() => this.test5()))
      .catch(reason => new Error(reason.message))
    result2 = await (new PromiseEventEmitter(() => this.test5()))
      .catch(reason => new Error(reason.message))
    assert(result1.message === result2.message && result2.message === 'this.test5 is not a function')

    result1 = await (new Promise(resolve => resolve('test6'))).finally(value => { result3 = value })
    result2 = await (new PromiseEventEmitter(emitter => emitter.resolve('test6'))).finally(value => { result4 = value })
    assert(result1 === result2 && result2 === 'test6')
    assert(result3 === result4 && result4 === undefined)

    try {
      await (new Promise((resolve, reject) => reject(new Error('test7')))).finally(() => {})
    } catch (error) {
      result1 = error.message
    }
    try {
      await (new PromiseEventEmitter(emitter => emitter.reject(new Error('test7')))).finally(() => {})
    } catch (error) {
      result2 = error.message
    }
    assert(result1 === result2 && result2 === 'test7')

    try {
      await (new Promise((resolve, reject) => reject(new Error('test7')))).finally(() => { this.test8() })
    } catch (error) {
      result1 = error.message
    }
    try {
      await (new PromiseEventEmitter(emitter => emitter.reject(new Error('test7')))).finally(() => { this.test8() })
    } catch (error) {
      result2 = error.message
    }
    assert(result1 === result2 && result2 === 'this.test8 is not a function')

    result1 = await (new Promise(resolve => resolve('test9')).then(value => {
      return value + '_9'
    }))
    result2 = await (new PromiseEventEmitter(emitter => emitter.resolve('test9')).then(value => {
      return value + '_9'
    }))
    assert(result1 === result2 && result2 === 'test9_9')

    result1 = await (new Promise(resolve => resolve('test10')).then(async value => {
      await new Promise(resolve => { setTimeout(resolve, 1) })

      return value + '_10'
    }))
    result2 = await (new PromiseEventEmitter(emitter => emitter.resolve('test10')).then(async value => {
      await new Promise(resolve => { setTimeout(resolve, 1) })

      return value + '_10'
    }))
    assert(result1 === result2 && result2 === 'test10_10')

    result1 = await (new Promise(resolve => this.test11()).catch(async reason => {
      await new Promise(resolve => { setTimeout(resolve, 1) })

      return reason.message + '_11'
    }))
    result2 = await (new PromiseEventEmitter(() => this.test11()).catch(async reason => {
      await new Promise(resolve => { setTimeout(resolve, 1) })

      return reason.message + '_11'
    }))
    assert(result1 === result2 && result2 === 'this.test11 is not a function_11')

    result1 = await new Promise(resolve => { resolve('test12') }).then().catch().then()
    result2 = await new PromiseEventEmitter(emitter => { emitter.resolve('test12') }).then().catch().then()
    assert(result1 === result2 && result2 === 'test12')

    result1 = await new Promise((resolve, reject) => { reject(new Error('test13')) })
      .then().catch(reason => reason.message)
    result2 = await new PromiseEventEmitter(emitter => { emitter.reject(new Error('test13')) })
      .then().catch(reason => reason.message)
    assert(result1 === result2 && result2 === 'test13')

    result1 = await new Promise((resolve, reject) => { reject(new Error('test14')) })
      .catch().catch(reason => reason.message)
    result2 = await new PromiseEventEmitter(emitter => { emitter.reject(new Error('test14')) })
      .catch().catch(reason => reason.message)
    assert(result1 === result2 && result2 === 'test14')

    result1 = await new Promise((resolve, reject) => { reject(new Error('test15')) })
      .catch(reason => { throw reason }).catch(reason => reason.message)
    result2 = await new PromiseEventEmitter(emitter => { emitter.reject(new Error('test15')) })
      .catch(reason => { throw reason }).catch(reason => reason.message)
    assert(result1 === result2 && result2 === 'test15')

    result1 = await new Promise((resolve, reject) => {
      reject(new Error('test16'))
      reject(new Error('test16_16'))
    }).catch(reason => { throw reason }).catch(reason => reason.message)
    result2 = await new PromiseEventEmitter(emitter => {
      emitter.reject(new Error('test16'))
      emitter.reject(new Error('test16_16'))
    }).catch(reason => { throw reason }).catch(reason => reason.message)
    assert(result1 === result2 && result2 === 'test16')

    result1 = await new Promise((resolve, reject) => {
      resolve('test17')
      resolve('test17_17')
    })
    result2 = await new PromiseEventEmitter(emitter => {
      emitter.resolve('test17')
      emitter.resolve('test17_17')
    })
    assert(result1 === result2 && result2 === 'test17')
  }

  /** PEE создается наследованием из Promise, с добавлением emitter,
   * при этом последующие then/catch/finally создают обычный Promise */
  async ['PromiseEventEmitter - создание, чейнинг']() {
    const pem = new PromiseEventEmitter()
    const tpem = pem.then(value => {
      return value + '+' + value
    })
    const t2pem = tpem.then()
    const cpem = pem.catch()
    const fpem = pem.finally()

    assert(pem instanceof PromiseEventEmitter)
    assert(!(tpem instanceof PromiseEventEmitter))
    assert(tpem instanceof Promise)
    assert(!(t2pem instanceof PromiseEventEmitter))
    assert(t2pem instanceof Promise)
    assert(!(cpem instanceof PromiseEventEmitter))
    assert(cpem instanceof Promise)
    assert(!(fpem instanceof PromiseEventEmitter))
    assert(fpem instanceof Promise)

    await pem.resolve('ok')

    const result = await pem
    const tresult = await tpem
    const t2result = await t2pem
    const cresult = await cpem
    const fresult = await fpem

    assert.equal(result, 'ok')
    assert.equal(tresult, 'ok+ok')
    assert.equal(t2result, 'ok+ok')
    assert.equal(cresult, 'ok')
    assert.equal(fresult, 'ok')
  }

  /** emit не должен ничего возвращать, ни чейнится */
  async ['PromiseEventEmitter - emit не возвращает результат']() {
    const em = new PromiseEventEmitter()
    let value = 0

    em.on('test', () => value++)

    const p = em.emit('test')
    const result = await p

    assert(em instanceof PromiseEventEmitter)
    assert(!(p instanceof PromiseEventEmitter))
    assert(p instanceof Promise)
    assert(result === undefined)
    assert.equal(value, 1)
  }

  /** Ошибки как и с Promise можно перехватывать через try/catch */
  async ['PromiseEventEmitter - перехват ошибок']() {
    const pem = new PromiseEventEmitter()
    let error = null

    await pem.reject('error')

    try {
      await pem
    } catch (err) {
      error = err
    }

    assert.equal(error, 'error')
  }

  /** executor не может вернуть значение, но может быть асинхронным,
   * чтобы отпустить текущий поток выполнения */
  async ['PromiseEventEmitter - асинхронный executor']() {
    let value = 0
    const pem = new PromiseEventEmitter(async emmiter => {
      await new Promise(resolve => setTimeout(resolve, 1))
      emmiter.resolve(++value + 1)
    })

    assert.equal(value, 0)

    const result = await pem

    assert.equal(result, 2)
    assert.equal(value, 1)
  }

  /** Ошибки в асинхронном executor должны перехватываться через try/catch */
  async ['PromiseEventEmitter - перехват асинхронной ошибки']() {
    const pem = new PromiseEventEmitter(async () => {
      await new Promise(resolve => setTimeout(resolve, 1))
      this.nonExistent()
    })
    let error = null

    try {
      await pem
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
  }

  /** Если у executor всего 1 аргумент emitter, то создается полноценный PEE,
   *  а внутри создается синхронный executor, который получает методы resolve, reject.
   * Если в конструктор PEE передается 2 аргумента, методы resolve, reject,
   *  то экземпляр создается как обычный Promise.
   * Это необходимо для поддержания правильного чейнинга,
   *    т.к. он должен создавать новые экземпляры Promise. */
  async ['PromiseEventEmitter - синхронный executor']() {
    const pem = new PromiseEventEmitter((resolve, reject) => {
      assert(typeof resolve === 'function')
      assert(typeof reject === 'function')
      resolve(1)
    })
    const result = await pem

    assert.equal(result, 1)
  }

  /** Ошибки в асинхронном executor должны перехватываться через try/catch */
  async ['PromiseEventEmitter - перехват синхронной ошибки']() {
    const pem = new PromiseEventEmitter((resolve, reject) => {
      reject('test')
    })
    let error = null

    try {
      await pem
    } catch (err) {
      error = err
    }

    assert.equal(error, 'test')
  }

  /** Ошибки в коде синхронного executor должны перехватываться через
   * try/catch на блоке с await для PEE, а не на конструкторе PEE */
  async ['PromiseEventEmitter - перехват синхронной ошибки в коде']() {
    const pem = new PromiseEventEmitter(() => {
      this.nonExistent()
    })
    let error = null

    try {
      await pem
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
  }

  /** once позволяет организовать обмен между executor'ом и внешним кодом,
   * не создавая при этом лишних callback'ов */
  async ['PromiseEventEmitter - once']() {
    let result2 = 0
    const pem = new PromiseEventEmitter(async emitter => {
      await emitter.emit('result1', 1)
      result2 = await emitter.once('result2')
      assert.deepEqual(result2, [2])
      result2 = result2[0] + 1
      await new Promise(resolve => { setTimeout(resolve, 1) }).then(() => {
        result2 = 0
      })
      emitter.resolve(4)
    })
    const [result1] = await pem.once('result1')

    assert.equal(result1, 1)
    assert.equal(result2, 0)

    const emitP = pem.emit('result2', 2)

    assert.equal(result2, 0)
    await emitP
    assert.equal(result2, 3)

    const result3 = await pem

    assert.equal(result2, 0)
    assert.equal(result3, 4)
  }

  /** В PromiseEventEmitter emit без await выполняется асинхронно, а код после него синхронно,
   * и если после emit есть ошибка, то once его ожидающий завершиться ошибкой */
  async ['PromiseEventEmitter - once, ошибка после emit']() {
    const pem = new PromiseEventEmitter(emitter => {
      emitter.emit('result1', 1).catch(reason => {})
      this.nonExistent()
    })
    let error = null

    try {
      await pem.once('result1')
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
    error = null

    try {
      await pem
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
  }

  /** Первая ошибка в обработчиках событий завершает Promise с ошибкой */
  async ['PromiseEventEmitter - emit, ошибка в обработчике']() {
    const pem = new PromiseEventEmitter(async emitter => {
      await emitter.emit('test', 'test')
    })
    let error = null

    pem.on('test', async test => {
      await new Promise(resolve => setTimeout(resolve, 1))
      assert.equal(test, 'test')
      this.nonExistent()
    })

    try {
      await pem
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
  }

  /** Если в событиях PEE возникает ошибка, то все последующие асинхронные действия завершаться этой ошибкой.
   * emit - не отправит событие и упадет с ошибкой возникшей ранее
   * once - не создаст новой подписки и упадет с ошибкой возникшей ранее */
  async ['PromiseEventEmitter - emit и once после ошибки']() {
    const pem = new PromiseEventEmitter(async emitter => {
      await new Promise(resolve => setTimeout(resolve, 1))
      this.nonExistent()
    })
    let error = null

    try {
      await pem.once('result1')
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
    error = null

    try {
      await pem.emit('result2')
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
    error = null

    try {
      await pem.once('result2')
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
    error = null

    try {
      await pem
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
  }

  /** Повторный emitter.reject не должен перетирать ошибку,
   * которую будут получать последующие асинхронные вызовы событий провалившегося обещания */
  async ['PromiseEventEmitter - emitter.reject - только 1 раз']() {
    const pem = new PromiseEventEmitter(async emitter => {
      await new Promise(resolve => setTimeout(resolve, 1))
      emitter.reject('test 1')
      emitter.reject('test 2')
    })
    let error = null

    try {
      await pem.once('result1')
    } catch (err) {
      error = err
    }

    assert.equal(error, 'test 1')
    error = null

    try {
      await pem.emit('result2')
    } catch (err) {
      error = err
    }

    assert.equal(error, 'test 1')
    error = null

    try {
      await pem.once('result2')
    } catch (err) {
      error = err
    }

    assert.equal(error, 'test 1')
    error = null

    try {
      await pem
    } catch (err) {
      error = err
    }

    assert.equal(error, 'test 1')
  }

  /** Проверяем, что можно обмениваться данными в асинхронном режиме
   * между основным и дочерним исполнением кода */
  async ['PromiseEventEmitter - once + emit, принял, обработал, отдал']() {
    let result2 = 0
    const pem = new PromiseEventEmitter(async emitter => {
      // Выполняем некоторые асинхронные операции
      await new Promise(resolve => setTimeout(resolve, 1))
      // Отправляем результат основной задаче
      await emitter.emit('result1', 1, 'test')
      // Ожидаем ответ от основной задачи
      result2 = await emitter.once('result2')
      // Обрабатываем ответ, отдаем результат и завершаем Promise через resolve
      emitter.resolve(result2[0] + 1)
    })
    // Ожидаем ответ от подзадачи
    const result1 = await pem.once('result1')

    // Отправляем доп. данные подзадаче
    pem.emit('result2', result1[0] + 1)

    // Ожидаем завершения подзадачи
    const result3 = await pem

    assert.deepEqual(result1, [1, 'test'])
    assert.deepEqual(result2, [2])
    assert.equal(result3, 3)
  }

  /** Ошибки внутри событий не должны влиять на результат PEE */
  async ['PromiseEventEmitter - errors in events']() {
    const pem = new PromiseEventEmitter()
    let error = null

    pem.on('test', () => {
      this.nonExistentInEvent()
    })

    try {
      await pem.emit('test')
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistentInEvent is not a function')

    pem.resolve('redy')

    const result = await pem

    assert.deepEqual(result, 'redy')
  }

}
