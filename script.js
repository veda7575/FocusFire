   class FocusTimer {
    constructor() {
    this.timerDuration = 25 * 60;
    this.timeLeft = this.timerDuration;
    this.isRunning = false;
    this.isBreak = false;
    this.interval = null;
    this.blockedSites = JSON.parse(localStorage.getItem('blockedSites')) || [];
    this.stats = JSON.parse(localStorage.getItem('focusStats')) || this.initializeStats();
    this.currentSound = null;
    this.emergencyMode = false;
    
    this.audioContext = null;
    this.sounds = {};
    
    this.initializeElements();
    this.initializeAudio();
    this.loadSavedData();
    this.updateDisplay();
    this.setupEventListeners();
}

initializeStats() {
    return {
        sessionsCompleted: 0,
        totalFocusMinutes: 0,
        emergenciesUsed: 0,
        currentStreak: 0,
        lastSessionDate: null
    };
}

initializeElements() {
    this.timerDisplay = document.getElementById('timer-display');
    this.startBtn = document.getElementById('start-btn');
    this.pauseBtn = document.getElementById('pause-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.sessionBtns = document.querySelectorAll('.session-btn');
    
    this.siteInput = document.getElementById('site-input');
    this.addSiteBtn = document.getElementById('add-site');
    this.blockedSitesList = document.getElementById('blocked-sites');
    
    this.soundBtns = document.querySelectorAll('.sound-btn');
    this.volumeSlider = document.getElementById('volume');
    
    this.emergencyBtn = document.getElementById('emergency-btn');
    this.emergencyTimer = document.getElementById('emergency-timer');
    this.emergencyTimeDisplay = document.getElementById('emergency-time');
    
    this.streakCount = document.getElementById('streak-count');
    this.sessionsToday = document.getElementById('sessions-today');
    this.totalFocus = document.getElementById('total-focus');
    this.emergenciesUsed = document.getElementById('emergencies-used');
    
    this.timerCircle = document.querySelector('.timer-circle');
}

initializeAudio() {
    const initAudio = () => {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createAllSounds();
        }
    };
    
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
}

createAllSounds() {
    this.sounds.rain = this.createBrownNoise();
    this.sounds.fire = this.createFireSound();
    this.sounds.coffee = this.createCoffeeShopSound();
    this.sounds.white = this.createWhiteNoise();
}

createBrownNoise() {
    const bufferSize = 4096;
    const noise = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    let lastOut = 0.0;
    
    noise.onaudioprocess = function(e) {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 0.5;
        }
    };
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0;
    noise.connect(gainNode);
    
    return { source: noise, gain: gainNode };
}

createFireSound() {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 80;
    
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    lfo.frequency.value = 2;
    lfoGain.gain.value = 30;
    
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.start();
    lfo.start();
    gainNode.gain.value = 0;
    
    return { source: oscillator, gain: gainNode, lfo: lfo };
}

createCoffeeShopSound() {
    const oscillators = [];
    const gains = [];
    
    for (let i = 0; i < 3; i++) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 200 + (i * 100);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        gainNode.gain.value = 0;
        
        oscillators.push(oscillator);
        gains.push(gainNode);
    }
    
    return { sources: oscillators, gains: gains };
}

createWhiteNoise() {
    const bufferSize = 4096;
    const noise = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    noise.onaudioprocess = function(e) {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    };
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0;
    noise.connect(gainNode);
    
    return { source: noise, gain: gainNode };
}

setupEventListeners() {
    this.startBtn.addEventListener('click', () => this.startTimer());
    this.pauseBtn.addEventListener('click', () => this.pauseTimer());
    this.resetBtn.addEventListener('click', () => this.resetTimer());
    
    this.sessionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            this.sessionBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            this.setTimerDuration(parseInt(e.target.dataset.minutes));
        });
    });
    
    this.addSiteBtn.addEventListener('click', () => this.addSiteToBlocklist());
    this.siteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.addSiteToBlocklist();
    });
    
    this.soundBtns.forEach(btn => {
        btn.addEventListener('click', (e) => this.toggleSound(e.target.dataset.sound));
    });
    
    this.volumeSlider.addEventListener('input', (e) => {
        this.setVolume(e.target.value / 100);
    });
    
    this.emergencyBtn.addEventListener('click', () => this.startEmergencyBreak());
}

setTimerDuration(minutes) {
    this.timerDuration = minutes * 60;
    this.timeLeft = this.timerDuration;
    this.updateDisplay();
}

startTimer() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startBtn.disabled = true;
    this.pauseBtn.disabled = false;
    
    this.interval = setInterval(() => {
        this.timeLeft--;
        this.updateDisplay();
        
        if (this.timeLeft <= 0) {
            this.completeTimer();
        }
    }, 1000);
}

pauseTimer() {
    this.isRunning = false;
    this.startBtn.disabled = false;
    this.pauseBtn.disabled = true;
    clearInterval(this.interval);
}

resetTimer() {
    this.pauseTimer();
    this.timeLeft = this.timerDuration;
    this.updateDisplay();
    this.timerCircle.classList.remove('timer-complete');
}

completeTimer() {
    this.pauseTimer();
    this.playCompletionSound();
    this.timerCircle.classList.add('timer-complete');
    
    this.stats.sessionsCompleted++;
    this.stats.totalFocusMinutes += this.timerDuration / 60;
    this.updateStreak();
    this.saveStats();
    this.updateStatsDisplay();
    
    setTimeout(() => {
        alert('Timer complete! Great job focusing! 🎉');
        this.timerCircle.classList.remove('timer-complete');
    }, 100);
}

updateDisplay() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const progress = ((this.timerDuration - this.timeLeft) / this.timerDuration) * 100;
    this.timerCircle.style.background = `conic-gradient(var(--primary-red) ${progress}%, var(--light-red) ${progress}%)`;
}

toggleSound(soundType) {
    if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.createAllSounds();
    }
    
    if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }
    
    this.soundBtns.forEach(btn => btn.classList.remove('active'));
    
    if (this.currentSound === soundType) {
        this.stopAllSounds();
        this.currentSound = null;
        return;
    }
    
    this.stopAllSounds();
    
    this.currentSound = soundType;
    const volume = this.volumeSlider.value / 100;
    
    switch(soundType) {
        case 'rain':
            this.sounds.rain.gain.connect(this.audioContext.destination);
            this.sounds.rain.gain.gain.value = volume * 0.3;
            break;
        case 'fire':
            this.sounds.fire.gain.gain.value = volume * 0.2;
            break;
        case 'coffee':
            this.sounds.coffee.gains.forEach(gain => {
                gain.gain.value = volume * 0.1;
            });
            break;
        case 'white':
            this.sounds.white.gain.connect(this.audioContext.destination);
            this.sounds.white.gain.gain.value = volume * 0.2;
            break;
    }
    
    event.target.classList.add('active');
}

stopAllSounds() {
    if (this.sounds.rain) {
        this.sounds.rain.gain.gain.value = 0;
        this.sounds.rain.gain.disconnect();
    }
    if (this.sounds.fire) {
        this.sounds.fire.gain.gain.value = 0;
    }
    if (this.sounds.coffee) {
        this.sounds.coffee.gains.forEach(gain => {
            gain.gain.value = 0;
        });
    }
    if (this.sounds.white) {
        this.sounds.white.gain.gain.value = 0;
        this.sounds.white.gain.disconnect();
    }
}

setVolume(volume) {
    if (this.currentSound && this.sounds[this.currentSound]) {
        switch(this.currentSound) {
            case 'rain':
                this.sounds.rain.gain.gain.value = volume * 0.3;
                break;
            case 'ocean':
                this.sounds.fire.gain.gain.value = volume * 0.2;
                break;
            case 'coffee':
                this.sounds.coffee.gains.forEach(gain => {
                    gain.gain.value = volume * 0.1;
                });
                break;
            case 'white':
                this.sounds.white.gain.gain.value = volume * 0.2;
                break;
        }
    }
}

playCompletionSound() {
    if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
    
    setTimeout(() => {
        oscillator.stop();
    }, 300);
}

addSiteToBlocklist() {
    const site = this.siteInput.value.trim().toLowerCase();
    if (!site) return;
    
    if (!this.blockedSites.includes(site)) {
        this.blockedSites.push(site);
        this.saveBlockedSites();
        this.updateBlockedSitesList();
        this.siteInput.value = '';
    }
}

removeSiteFromBlocklist(site) {
    this.blockedSites = this.blockedSites.filter(s => s !== site);
    this.saveBlockedSites();
    this.updateBlockedSitesList();
}

updateBlockedSitesList() {
    this.blockedSitesList.innerHTML = '';
    this.blockedSites.forEach(site => {
        const siteElement = document.createElement('div');
        siteElement.className = 'blocked-site';
        siteElement.innerHTML = `
            <span>${site}</span>
            <button class="remove-site" onclick="focusTimer.removeSiteFromBlocklist('${site}')">×</button>
        `;
        this.blockedSitesList.appendChild(siteElement);
    });
}

startEmergencyBreak() {
    if (this.emergencyMode) return;
    
    this.emergencyMode = true;
    this.stats.emergenciesUsed++;
    this.saveStats();
    this.updateStatsDisplay();
    
    this.pauseTimer();
    this.emergencyTimer.classList.remove('hidden');
    
    let emergencyTime = 5 * 60;
    const emergencyInterval = setInterval(() => {
        const minutes = Math.floor(emergencyTime / 60);
        const seconds = emergencyTime % 60;
        this.emergencyTimeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        emergencyTime--;
        
        if (emergencyTime < 0) {
            clearInterval(emergencyInterval);
            this.endEmergencyBreak();
        }
    }, 1000);
}

endEmergencyBreak() {
    this.emergencyMode = false;
    this.emergencyTimer.classList.add('hidden');
    alert('Emergency break over! Time to get back to work! 🔥');
}

updateStreak() {
    const today = new Date().toDateString();
    const lastSession = this.stats.lastSessionDate;
    
    if (lastSession === today) return;
    
    if (!lastSession || this.isConsecutiveDay(lastSession)) {
        this.stats.currentStreak++;
    } else {
        this.stats.currentStreak = 1;
    }
    
    this.stats.lastSessionDate = today;
}

isConsecutiveDay(lastDate) {
    const last = new Date(lastDate);
    const today = new Date();
    const diffTime = today - last;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
}

updateStatsDisplay() {
    this.streakCount.textContent = this.stats.currentStreak;
    this.sessionsToday.textContent = this.stats.sessionsCompleted;
    this.totalFocus.textContent = Math.floor(this.stats.totalFocusMinutes);
    this.emergenciesUsed.textContent = this.stats.emergenciesUsed;
}

saveBlockedSites() {
    localStorage.setItem('blockedSites', JSON.stringify(this.blockedSites));
}

saveStats() {
    localStorage.setItem('focusStats', JSON.stringify(this.stats));
}

loadSavedData() {
    this.updateBlockedSitesList();
    this.updateStatsDisplay();
}
 }