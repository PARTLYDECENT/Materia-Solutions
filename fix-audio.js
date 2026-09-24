(function() {
    // ─── MATERIA AUDIO ENGINE SAFETY & PRISTINE FILTER PROTECTION ───
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    // 1. Tag BiquadFilterNode AudioParams when created
    if (AC.prototype && !AC.prototype.__biquadGuardPatched) {
        AC.prototype.__biquadGuardPatched = true;
        const origBiquad = AC.prototype.createBiquadFilter;
        AC.prototype.createBiquadFilter = function() {
            const filter = origBiquad.call(this);
            if (filter.frequency) filter.frequency.__paramName = 'frequency';
            if (filter.Q) filter.Q.__paramName = 'Q';
            if (filter.gain) filter.gain.__paramName = 'filterGain';
            return filter;
        };
    }

    // 2. Polyfill / Sanitize AudioParam methods to prevent RangeError & BiquadFilter Instability
    if (window.AudioParam && !window.AudioParam.prototype.__materiaPatched) {
        window.AudioParam.prototype.__materiaPatched = true;

        const origSet = window.AudioParam.prototype.setValueAtTime;
        const origLinear = window.AudioParam.prototype.linearRampToValueAtTime;
        const origExpo = window.AudioParam.prototype.exponentialRampToValueAtTime;
        const origTarget = window.AudioParam.prototype.setTargetAtTime;

        function clampParam(param, value) {
            if (!isFinite(value)) return 0.0001;
            if (param.__paramName === 'frequency') {
                return Math.max(20, Math.min(18000, value));
            }
            if (param.__paramName === 'Q') {
                return Math.max(0.001, Math.min(10, value));
            }
            if (param.__paramName === 'filterGain') {
                return Math.max(-24, Math.min(12, value));
            }
            return value;
        }

        window.AudioParam.prototype.setValueAtTime = function(value, startTime) {
            let safeVal = clampParam(this, value);
            return origSet.call(this, safeVal, isFinite(startTime) ? startTime : 0);
        };

        window.AudioParam.prototype.linearRampToValueAtTime = function(value, endTime) {
            let safeVal = clampParam(this, value);
            return origLinear.call(this, safeVal, isFinite(endTime) ? endTime : 0);
        };

        window.AudioParam.prototype.exponentialRampToValueAtTime = function(value, endTime) {
            let safeVal = clampParam(this, value);
            if (safeVal <= 0.00001) safeVal = 0.0001;
            let safeTime = isFinite(endTime) ? endTime : 0;
            try {
                return origExpo.call(this, safeVal, safeTime);
            } catch (e) {
                return origLinear.call(this, safeVal, safeTime);
            }
        };

        window.AudioParam.prototype.setTargetAtTime = function(target, startTime, timeConstant) {
            let safeVal = clampParam(this, target);
            let safeTime = isFinite(startTime) ? startTime : 0;
            let safeTc = isFinite(timeConstant) && timeConstant > 0 ? timeConstant : 0.1;
            try {
                return origTarget.call(this, safeVal, safeTime, safeTc);
            } catch(e) {
                return origSet.call(this, safeVal, safeTime);
            }
        };
    }

    if (AC.prototype.__biquadPatched) {
        delete AC.prototype.__biquadPatched;
    }
})();
