(function() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC && !AC.prototype.__biquadPatched) {
        AC.prototype.__biquadPatched = true;
        // The user explicitly requested to remove BiquadFilterNodes to stop explosions.
        AC.prototype.createBiquadFilter = function() {
            const gain = this.createGain();
            // Stub out BiquadFilterNode specific properties to prevent JS TypeError crashes
            const stubParam = {
                value: 0,
                setValueAtTime: function() {},
                linearRampToValueAtTime: function() {},
                exponentialRampToValueAtTime: function() {},
                cancelScheduledValues: function() {},
                setTargetAtTime: function() {},
                setValueCurveAtTime: function() {}
            };
            gain.frequency = stubParam;
            gain.Q = stubParam;
            gain.detune = stubParam;
            gain.getFrequencyResponse = function() {};
            return gain;
        };
    }
})();
