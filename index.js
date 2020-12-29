(function() {
  'use strict';

  const images = ['BOS', 'WOLKEN', 'VOGEL1', 'VOGEL2', 'VOGEL3', 'BOOM1-V2', 'BOOM2-V2', 'BOOM3-V2', 'BUN1', 'BUN2', 'BUN3', 'BUN4', 'BUN5', 'BUN6', 'BUN7', 'WORTEL', 'HOL+GRAS', 'RabbitRun-3', 'RabbitRun-2', 'RabbitRun-1', 'RabbitRun-0'];
  let imagesToLoad = images.length;

  const loader = document.getElementById('loader');
  const loaded = () => {
    if (--imagesToLoad === 0) {
      for (const [index, count] of [[5, 3], [0, 1]]) {
        const prerenderCanvas = document.createElement('canvas');
        const prerenderContext = prerenderCanvas.getContext('2d');

        prerenderCanvas.width = 6000;
        prerenderCanvas.height = 1080;

        if (index === 0) {
          const skyGradient = prerenderContext.createLinearGradient(0, 0, 0, prerenderCanvas.height);

          skyGradient.addColorStop(0, '#adecfd');
          skyGradient.addColorStop(1, '#cef3fc');

          prerenderContext.fillStyle = skyGradient;
          prerenderContext.fillRect(0, 0, prerenderCanvas.width, prerenderCanvas.height);
        }

        for (let i = index; i < index + count; i++) {
          prerenderContext.drawImage(images[i], { 5: 1038, 6: 2307, 7: 4619 }[i] || 0, { 0: 634 }[i] || 0);
        }

        images.splice(index, count, prerenderCanvas);
      }

      const play = document.getElementById('play');

      play.addEventListener('click', (event) => {
        document.body.dataset.screen = 'game';

        game(images, event.timeStamp);
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && document.body.dataset.screen === 'menu') {
          play.dispatchEvent(new Event('click'));
        }
      });
    }

    loader.style.width = `${(images.length - imagesToLoad) / images.length * 100}%`;
  }

  for (let i = 0; i < imagesToLoad; i++) {
    const filename = `images/${images[i]}.png`;

    images[i] = new Image();
    images[i].addEventListener('load', loaded, { once: true });
    images[i].src = filename;
  }

  const audio = {
    music: new Audio('sounds/RR FULL.mp3'),
    sounds: {
      bird: ['RR VOGEL 2', 'RR VOGEL 2', 0.5],
      carrot: ['WORTEL1', 'WORTEL2', 'WORTEL3', 0.8]
    },
    load: function() {
      this.music.loop = true;
      this.music.volume = 0.28;

      for (const sounds of Object.values(this.sounds)) {
        const volume = sounds.pop();

        for (let i = 0; i < sounds.length; i++) {
          const sound = new Audio(`sounds/${sounds[i]}.wav`);

          sound.volume = volume;
          sound.preload = 'auto';

          sound.addEventListener('ended', () => sounds.push(sound));
          sounds[i] = sound;
        }
      }
    },
    fadeIn: function(target) {
      if ((this.music.volume += 0.02) < target - 0.01) {
        this.timeout = setTimeout(() => this.fadeIn(target), 50);
      }
    },
    fadeOut: function(target) {
      if ((this.music.volume -= 0.02) > target + 0.01) {
        this.timeout = setTimeout(() => this.fadeOut(target), 50);
      } else if (target === 0) {
        this.music.pause();
      }
    },
    play: function(sound) {
      if (settings.audio[0][0] && this.sounds[sound].length > 0) {
        const index = Math.floor(Math.random() * this.sounds[sound].length);

        this.sounds[sound].splice(index, 1)[0].play();
      }
    }
  }

  audio.load();

  const personalBest = {
    time: Infinity,
    store: function(timestamp, stopwatch, keyboard) {
      if (timestamp - stopwatch.origin >= this.time) return false;

      this.time = timestamp - stopwatch.origin;
      this.keys = {};

      for (const [key, timestamps] of Object.entries(keyboard.keys)) {
        this.keys[key] = timestamps.slice();

        if (keyboard.isPressed(key)) {
          this.keys[key].push(timestamp - keyboard.origin);
        }
      }

      if (settings.persistence[0][0]) {
        localStorage.setItem('personalBest', JSON.stringify(this));
      }

      return true;
    }
  }

  const settings = {
    audio: [[true, 'ON'], [false, 'OFF']],
    graphics: [[1, 'NORMAL'], [0.5, 'LOW']],
    persistence: [[false, 'NO'], [true, 'YES']],
    rotate: function(setting) {
      if (setting === 'persistence') {
        if (this.persistence[0][0]) {
          personalBest.time = Infinity;

          localStorage.clear();
        } else if (personalBest.time < Infinity) {
          localStorage.setItem('personalBest', JSON.stringify(personalBest));
        }
      } else if (setting === 'audio' && audio.music.currentTime > 0) {
        clearTimeout(audio.timeout);

        if (this.audio[0][0]) {
          audio.fadeOut(0);
        } else {
          audio.fadeIn(0.1);

          audio.music.play();
        }
      }

      this[setting].push(this[setting].shift());
    },
    redraw: function(image) {
      image.src = `images/RabbitRun-${this[image.dataset.setting][0][1]}.png`;
    }
  }

  if (devicePixelRatio > 1) {
    settings.graphics.unshift([devicePixelRatio, 'HIGH']);
  }

  const persistedBest = localStorage.getItem('personalBest');

  if (persistedBest !== null) {
    Object.assign(personalBest, JSON.parse(persistedBest));

    settings.rotate('persistence');
  }

  document.getElementById('values').querySelectorAll('img').forEach((image) => {
    image.parentNode.addEventListener('click', () => {
      settings.rotate(image.dataset.setting);
      settings.redraw(image);
    });

    settings.redraw(image);
  });

  document.getElementById('settings').addEventListener('click', () => document.body.dataset.screen = 'settings');

  const back = document.getElementById('back');

  back.addEventListener('click', () => document.body.dataset.screen = 'menu');

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.dataset.screen === 'settings') {
       back.dispatchEvent(new Event('click'));
    }
  });

  function game(images, timestamp) {
    const eventListeners = {
      instances: [],
      add: function(target, type, listener) {
        target.addEventListener(type, listener);

        this.instances.push({ target, type, listener });
      },
      clear: function() {
        for (const { target, type, listener } of this.instances) {
          target.removeEventListener(type, listener);
        }
      }
    }

    const keyMap = { d: 'ArrowRight', a: 'ArrowLeft' , w: 'ArrowUp' };

    eventListeners.add(document, 'keydown', (event) => {
      if (event.key === 'Enter' && document.body.dataset.screen === 'done') {
        document.getElementById('retry').dispatchEvent(new Event('click'));
      } else if (event.key === 'Escape') {
        document.getElementById('exit').dispatchEvent(new Event('click'));
      } else if (!event.repeat) {
        if (event.key === 'g' && countdown.count <= 0) {
          ghosts.instances.push(new Rabbit(new KeyboardTracer(event.timeStamp, keyboard.keys)));
        } else {
          keyboard.addSwitch(keyMap[event.key] || event.key, event.timeStamp, 0);
        }
      }
    });

    eventListeners.add(document, 'keyup', (event) => keyboard.addSwitch(keyMap[event.key] || event.key, event.timeStamp, 1));

    eventListeners.add(document, 'visibilitychange', (event) => {
      if (document.hidden) {
        for (const key of Object.keys(keyboard.keys)) {
          keyboard.addSwitch(key, event.timeStamp, 1);
        }
      }
    });

    const keyboard = {
      lock: { ArrowRight: 0, ArrowLeft: 0, ArrowUp: 0 },
      keys: { ArrowRight: [], ArrowLeft: [], ArrowUp: [] },
      addSwitch: function(key, timestamp, prerequisite) {
        if (countdown.count > 0) {
          if (this.lock.hasOwnProperty(key) && this.lock[key] === prerequisite) {
            this.lock[key] = 1 - this.lock[key];
          }
        } else {
          if (this.keys.hasOwnProperty(key) && this.isPressed(key) === prerequisite) {
            this.keys[key].push(timestamp - this.origin);
          }
        }
      },
      isPressedRatio: function(key, timestamp, delta) {
        if (this.keys[key].length === 0) return 0;

        const lastSwitchAt = this.origin + this.keys[key][this.keys[key].length - 1]
        const lastSwitchSince = Math.min((timestamp - lastSwitchAt) / 1000, delta);

        return this.keys[key].length % 2 ? lastSwitchSince : delta - lastSwitchSince;
      },
      isPressed: function(key) {
        return this.keys[key].length % 2;
      },
      unlock: function(timestamp) {
        this.origin = timestamp;

        for (const key of Object.keys(keyboard.keys)) {
          if (this.lock[key]) {
            this.lock[key] = 0;

            this.addSwitch(key, timestamp, 0);
          }
        }
      }
    }

    class KeyboardTracer {
      constructor(timestamp, keys) {
        this.origin = timestamp;
        this.keys = keys;
        this.indices = {};

        Object.keys(keys).forEach((key) => this.indices[key] = 0);
      }

      update(timestamp) {
        for (const key of Object.keys(this.keys)) {
          if (timestamp - this.origin >= this.keys[key][this.indices[key]]) {
            this.indices[key]++;
          }
        }
      }

      isPressedRatio(key, timestamp, delta) {
        if (this.indices[key] === 0) return 0;

        const lastSwitchAt = this.origin + this.keys[key][this.indices[key] - 1];
        const lastSwitchSince = Math.min((timestamp - lastSwitchAt) / 1000, delta);

        return this.indices[key] % 2 ? lastSwitchSince : (this.indices[key] ? delta - lastSwitchSince : 0);
      }

      isPressed(key) {
        return this.indices[key] % 2;
      }
    }

    const canvas = document.querySelector('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    canvas.style.transform = `scale(${1 / settings.graphics[0][0]})`;

    const camera = {
      updateSize: function() {
        canvas.width = Math.min(innerWidth, innerHeight * world.width / world.height) * settings.graphics[0][0];
        canvas.height = innerHeight * settings.graphics[0][0];

        this.factor = canvas.height / world.height;
        this.width = canvas.width / canvas.height * world.height;

        this.updatePosition();
      },
      updatePosition: function() {
        this.x = Math.min(Math.max(player.x - this.width / 2, 0), world.width - this.width);

        context.setTransform(this.factor, 0, 0, this.factor, -this.x * this.factor, 0);
      }
    }

    eventListeners.add(window, 'resize', () => camera.updateSize());

    const world = {
      width: 2000,
      height: 360,
      drift: 0,
      update: function(delta) {
        this.drift = (world.drift + 50 * delta) % this.width;
      },
      draw: function(index) {
        context.drawImage(images[index], camera.x * 3, 0, camera.width * 3, this.height * 3, camera.x, 0, camera.width, this.height);
      },
      drawBackground: function() {
        this.draw(0);

        const split = this.width - this.drift;

        if (split > camera.x) {
          const width = split - camera.x;

          context.drawImage(images[1], (camera.x + this.drift) * 3, 0, width * 3, this.height * 3, camera.x, 0, width, this.height);
        }

        if (split < camera.x + camera.width) {
          const width = camera.x + camera.width - split;

          context.drawImage(images[1], 0, 0, width * 3, this.height * 3, split, 0, width, this.height);
        }
      },
      drawTrees: function() {
        this.draw(5);
      },
      drawForeground: function() {
        this.draw(14);
      }
    }

    const bird = {
      frame: 0,
      update: function(delta) {
        if (this.frame) {
          if ((this.frame += 11 * delta) >= 8) {
            this.frame = 0;
            this.flaps = false;
          }
        } else if (player.x - 48 <= 2021 && player.x + 48 >= 1855 && player.y - 53 <= 217 && player.y >= 40) {
          if (this.flaps) {
            audio.play('bird');

            this.frame = 11 * delta;
          }
        } else {
          this.flaps = true;
        }
      },
      draw: function() {
        const frame = Math.floor(this.frame) % 4;

        context.drawImage(images[4 - Math.abs(frame - 2)], 5790 / 3, 346 / 3, 47 / 3, 80 / 3);
      }
    }

    const collision = {
      lines: [ // order by y ascending
        { x: 820, y: 100, width: 185 },
        { x: 370, y: 140, width: 180 },
        { x: 1755, y: 140, width: 180 },
        { x: 1065, y: 175, width: 155 },
        { x: 600, y: 240, width: 130 },
        { x: 1580, y: 240, width: 125 },
        { x: 945, y: 275, width: 55 },
        { x: 0, y: 357, width: 2000 }
      ],
      check: function(x, y, vspeed) {
        for (const line of this.lines) {
          if (x >= line.x && x < line.x + line.width && y - 1 < line.y && y + vspeed >= line.y) {
            return line.y - y;
          }
        }
      },
      draw: function() {
        context.fillStyle = 'yellow';

        for (const line of this.lines) {
          context.fillRect(line.x, line.y, line.width, 1);
        }
      }
    }

    const counter = document.getElementById('counter').lastChild;
    const carrots = {
      instances: [
        { x: 470, y: 30, eating: 0 },
        { x: 520, y: 135, eating: 0 },
        { x: 670, y: 30, eating: 0 },
        { x: 745, y: 250, eating: 0 },
        { x: 940, y: 25, eating: 0 },
        { x: 1140, y: 25, eating: 0 },
        { x: 1160, y: 190, eating: 0 },
        { x: 1615, y: 235, eating: 0 },
        { x: 1835, y: 35, eating: 0 },
        { x: 1970, y: 355, eating: 0 }
      ],
      eaten: [],
      update: function(delta) {
        for (const [index, instance] of this.instances.entries()) {
          if (instance.eating > 0 || (player.x - 48 <= instance.x + 5 && player.x + 48 >= instance.x - 5 && player.y - 53 <= instance.y + 5 && player.y >= instance.y - 5)) {
            if (instance.eating === 0) audio.play('carrot');

            if ((instance.eating += 4 * delta) >= 1) {
              instance.eating = 0;

              this.eaten.push(this.instances.splice(index, 1)[0]);

              counter.textContent = this.instances.length;
            }
          }
        }
      },
      draw: function() {
        for (const instance of this.instances) {
          const x = instance.x - 17 + instance.eating * (player.x + 25 * (player.flip ? -1 : 1) - instance.x);
          const y = instance.y - 15 + instance.eating * (player.y - 17 - instance.y);

          context.globalAlpha = 1 - instance.eating;
          context.drawImage(images[13], x, y, 34, 30);
        }

        context.globalAlpha = 1;
      }
    }

    counter.textContent = carrots.instances.length;

    const ghosts = {
      instances: [],
      update: function(timestamp, delta) {
        for (const instance of this.instances) {
          instance.keyboard.update(timestamp);
          instance.update(timestamp, delta);
        }
      },
      draw: function() {
        context.globalAlpha = 0.5;
        this.instances.forEach((instance) => instance.draw());
        context.globalAlpha = 1;
      }
    }

    class Rabbit {
      constructor(keyboard) {
        this.keyboard = keyboard;

        this.init();
      }

      init() {
        this.x = 65;
        this.y = 357;
        this.vspeed = 0;
        this.jumping = false;
        this.flip = false;
        this.frame = 0;
      }

      update(timestamp, delta) {
        const direction = this.keyboard.isPressedRatio('ArrowRight', timestamp, delta) - this.keyboard.isPressedRatio('ArrowLeft', timestamp, delta);

        if (direction > 0) this.flip = false;
        if (direction < 0) this.flip = true;

        this.x = Math.min(Math.max(this.x + direction * 200, 17), world.width - 18);

        if (this.keyboard.isPressed('ArrowUp') && !this.jumping) {
          this.vspeed = -10;
        }

        const minPixelsToLine = collision.check(this.x, this.y, this.vspeed * 60 * delta);

        if (minPixelsToLine === undefined) {
          this.y += this.vspeed * 60 * delta;
          this.vspeed += 25 * delta;
          this.jumping = true;
        } else {
          this.y += minPixelsToLine;
          this.vspeed = 0;
          this.jumping = false;
        }

        if (this.jumping) {
          this.frame = this.vspeed > 0 ? 5 : 3;
        } else if (direction === 0) {
          this.frame = 0;
        } else {
          this.frame = (this.frame + 12 * delta) % 7;
        }
      }

      draw() {
        if (this.flip) {
          context.scale(-1, 1);
          context.drawImage(images[6 + Math.floor(this.frame)], -this.x - 48, this.y - 53, 96, 53);
          context.scale(-1, 1);
        } else {
          context.drawImage(images[6 + Math.floor(this.frame)], this.x - 48, this.y - 53, 96, 53);
        }
      }
    }

    const player = new Rabbit(keyboard);
    const countdown = {
      element: document.getElementById('countdown'),
      start: function() {
        this.element.style.display = 'initial';
        this.count = 4;

        this.down();
      },
      down: function() {
        if (this.count-- > 0) {
          this.element.src = images[18 - this.count].src;
          this.timeout = setTimeout(() => this.down(), 1000);

          if (this.count === 0) {
            if (personalBest.time < Infinity) {
              ghosts.instances.push(new Rabbit(new KeyboardTracer(previousTime, personalBest.keys)));
            }

            keyboard.unlock(previousTime);
            stopwatch.start(previousTime);
          }
        } else {
          this.element.removeAttribute('style');
        }
      },
      cancel: function() {
        this.element.removeAttribute('style');

        clearTimeout(this.timeout);
      }
    }

    const best = document.getElementById('best');
    const time = document.getElementById('time');
    const stopwatch = {
      element: document.getElementById('stopwatch'),
      active: false,
      update: function(timestamp) {
        if (!this.active) return;

        if (carrots.instances.length > 0 || player.x > 48 || player.y !== 357) {
          this.element.textContent = this.format(timestamp - this.origin, false);
        } else {
          time.textContent = this.format(timestamp - this.origin, true);

          if (personalBest.store(timestamp, this, keyboard)) {
            best.textContent = 'NEW PERSONAL BEST';
          } else {
            best.textContent = `PERSONAL BEST: ${this.format(personalBest.time, true)}`;
          }

          this.stop();
        }
      },
      format: function(elapsed, precise) {
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor(elapsed / 1000 - minutes * 60);

        let string = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (precise) {
          const milliseconds = Math.floor(elapsed - minutes * 60000 - seconds * 1000);

          string += `.${milliseconds.toString().padStart(3, '0')}`;
        }

        return string;
      },
      start: function(timestamp) {
        this.origin = timestamp;
        this.active = true;
      },
      stop: function() {
        this.active = false;

        document.body.dataset.screen = 'done';
      }
    }

    eventListeners.add(document.getElementById('retry'), 'click', () => {
      document.body.dataset.screen = 'game';

      Object.values(keyboard.keys).forEach((key) => key.length = 0);

      world.drift = 0;

      [carrots.instances, carrots.eaten] = [carrots.eaten, carrots.instances];
      counter.textContent = carrots.instances.length;

      ghosts.instances.length = 0;

      player.init();
      countdown.start();

      stopwatch.element.textContent = '0:00';
    });

    stopwatch.element.textContent = '0:00';

    eventListeners.add(document.getElementById('exit'), 'click', () => {
      eventListeners.clear();
      countdown.cancel();

      cancelAnimationFrame(request);

      document.body.dataset.screen = 'menu';

      clearTimeout(audio.timeout);
      audio.fadeOut(0.1);
    });

    clearTimeout(audio.timeout);
    audio.fadeIn(0.3);

    if (settings.audio[0][0]) {
      audio.music.play();
    }

    let previousTime = timestamp;

    function loop(currentTime) {
      const delta = (currentTime - previousTime) / 1000;

      world.update(delta);
      ghosts.update(currentTime, delta);
      player.update(currentTime, delta);
      bird.update(delta);
      carrots.update(delta);
      stopwatch.update(currentTime);
      camera.updatePosition();

      previousTime = currentTime;

      world.drawBackground();
      bird.draw();
      world.drawTrees();
      ghosts.draw();
      player.draw();
      carrots.draw();
      world.drawForeground();
      // collision.draw();

      request = requestAnimationFrame(loop);
    }

    let request = requestAnimationFrame(loop);

    camera.updateSize();
    countdown.start();
  }
})();
