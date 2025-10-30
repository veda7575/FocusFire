// FocusFire Productivity Timer + Sound Manager
document.addEventListener('DOMContentLoaded', () => {
  class FocusFire {
    constructor() {
      this.timeLeft = 1500; // 25 min
      this.timerInterval = null;
      this.isRunning = false;
      this.blockedSites = this.loadBlockedSites();

      // Elements
      this.display = document.getElementById('timer-display');
      this.startBtn = document.getElementById('start-btn');
      this.pauseBtn = document.getElementById('pause-btn');
      this.resetBtn = document.getElementById('reset-btn');
      this.blockInput = document.getElementById('block-input');
      this.blockBtn = document.getElementById('add-block-btn');
      this.list = document.getElementById('blocked-list');
      this.soundBtns = document.querySelectorAll('.sound-btn');

      // Audio context setup
      this.audioContext = null;
      this.sounds = {};

      this.addEventListeners();
      this.initializeAudio();
      this.renderBlockedSites();
    }

    addEventListeners() {
      this.startBtn.addEventListener('click', () => this.startTimer());
      this.pauseBtn.addEventListener('click', () => this.pauseTimer());
      this.resetBtn.addEventListener('click', () => this.resetTimer());
      this.blockBtn.addEventListener('click', () => this.addBlockedSite());
      this.soundBtns.forEach(btn =>
        btn.addEventListener('click', (e) => this.toggleSound(e))
      );
    }

    initializeAudio() {
      const initAudio = () => {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          this.createAllSounds();
        } else if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
      };
      document.addEventListener('click', initAudio, { once: true });
      document.addEventListener('touchstart', initAudio, { once: true });
    }

    createAllSounds() {
      ['rain', 'forest', 'fire'].forEach(type => {
        const audioEl = document.getElementById(`${type}-sound`);
        if (!audioEl) return;
        const source = this.audioContext.createMediaElementSource(audioEl);
        const gain = this.audioContext.createGain();
        source.connect(gain).connect(this.audioContext.destination);
        this.sounds[type] = { element: audioEl, gain, playing: false };
      });
    }

    toggleSound(e) {
      const type = e.target.dataset.sound;
      const sound = this.sounds[type];
      if (!sound) return;

      if (sound.playing) {
        sound.element.pause();
        sound.playing = false;
        e.target.classList.remove('active');
      } else {
        for (const key in this.sounds) {
          const s = this.sounds[key];
          if (s.playing) {
            s.element.pause();
            s.playing = false;
            document.querySelector(`[data-sound="${key}"]`)?.classList.remove('active');
          }
        }
        sound.element.play();
        sound.playing = true;
        e.target.classList.add('active');
      }
    }

    startTimer() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.timerInterval = setInterval(() => {
        this.timeLeft--;
        this.updateDisplay();
        if (this.timeLeft <= 0) this.resetTimer();
      }, 1000);
    }

    pauseTimer() {
      clearInterval(this.timerInterval);
      this.isRunning = false;
    }

    resetTimer() {
      clearInterval(this.timerInterval);
      this.isRunning = false;
      this.timeLeft = 1500;
      this.updateDisplay();
    }

    updateDisplay() {
      const min = Math.floor(this.timeLeft / 60);
      const sec = this.timeLeft % 60;
      this.display.textContent = `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    addBlockedSite() {
      const site = this.blockInput.value.trim();
      if (!site) return;
      if (!this.blockedSites.includes(site)) this.blockedSites.push(site);
      this.blockInput.value = '';
      this.saveBlockedSites();
      this.renderBlockedSites();
    }

    renderBlockedSites() {
      this.list.innerHTML = '';
      this.blockedSites.forEach(site => {
        const li = document.createElement('li');
        li.textContent = site;
        this.list.appendChild(li);
      });
    }

    saveBlockedSites() {
      try {
        localStorage.setItem('blockedSites', JSON.stringify(this.blockedSites));
      } catch (e) {
        console.warn('LocalStorage not available');
      }
    }

    loadBlockedSites() {
      try {
        const saved = localStorage.getItem('blockedSites');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
  }

  new FocusFire();
});
