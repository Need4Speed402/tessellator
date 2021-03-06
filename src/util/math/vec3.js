/**
 * Copyright (c) 2015, Alexander Orzechowski.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */


/**
 * Currently in beta stage. Changes can and will be made to the core mechanic
 * making this not backwards compatible.
 * 
 * Github: https://github.com/Need4Speed402/tessellator
 */

Tessellator.vec3 = function (){
    var array = new Float32Array(3);
    var pos = 0;
    
    for (var i = 0, k = arguments.length; i < k; i++){
        var arg = arguments[i];
        
        if (typeof arg !== "number"){
            if (arg.tween) arg.tween.update();
            
            array.set(arg, pos);
            pos += arg.length;
        }else{
            array[pos++] = arg;
        };
    };
    
    if (pos === 1){
        array[1] = array[0];
        array[2] = array[0];
    }else if (pos !== 0){
        if (pos < array.length){
            throw "too little information";
        }else if (pos > array.length){
            throw "too much information";
        };
    };
    
    array.__proto__ = Tessellator.vec3.prototype;
    
    return array;
};

Tessellator.vec3.prototype = Object.create(Float32Array.prototype);
Tessellator.vec3.prototype.constructor = Tessellator.vec3;

Tessellator.vec3.prototype.clear = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 0;
    this[1] = 0;
    this[3] = 0;
};

Tessellator.vec3.prototype.clone = function (){
    return Tessellator.vec3(this);
};

Tessellator.vec3.prototype.copy = function (vec3){
    if (this.tween) this.tween.cancel();
    if (vec3.tween) vec3.tween.update();
    
    this.set(vec3);
    
    return this;
};

Tessellator.vec3.prototype.pow = function(vec){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = Math.pow(this[0], vec[0]);
        this[1] = Math.pow(this[1], vec[1]);
        this[2] = Math.pow(this[2], vec[2]);
    }else{
        this[0] = Math.pow(this[0], vec);
        this[1] = Math.pow(this[1], vec);
        this[2] = Math.pow(this[2], vec);
    };
    
    return this;
};

Tessellator.vec3.prototype.sqrt = function(){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.sqrt(this[0]);
    this[1] = Math.sqrt(this[1]);
    this[2] = Math.sqrt(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.inversesqrt = function(){
    if (this.tween) this.tween.cancel();
    
    this[0] = 1 / Math.sqrt(this[0]);
    this[1] = 1 / Math.sqrt(this[1]);
    this[2] = 1 / Math.sqrt(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.abs = function(){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.abs(this[0]);
    this[1] = Math.abs(this[1]);
    this[2] = Math.abs(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.sign = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = this[0] > 0 ? 1 : (this[0] < 0 ? -1 : this[0]);
    this[1] = this[1] > 0 ? 1 : (this[1] < 0 ? -1 : this[1]);
    this[2] = this[2] > 0 ? 1 : (this[2] < 0 ? -1 : this[2]);
    
    return this;
};

Tessellator.vec3.prototype.rotate = function (matrix){
    if (this.tween) this.tween.cancel();
    
    var x = this[0],
        y = this[1],
        z = this[2];
    
    if (matrix.length === 16){
        this[0] = matrix[ 0] * x + matrix[ 4] * y + matrix[ 8] * z;
        this[1] = matrix[ 1] * x + matrix[ 5] * y + matrix[ 9] * z;
        this[2] = matrix[ 2] * x + matrix[ 6] * y + matrix[10] * z;
    }else if (matrix.length === 9){
        this[0] = matrix[0] * x + matrix[3] * y + matrix[6] * z;
        this[1] = matrix[1] * x + matrix[4] * y + matrix[7] * z;
        this[2] = matrix[2] * x + matrix[5] * y + matrix[8] * z;
    };
    
    return this;
};

Tessellator.vec3.prototype.step = function (edge){
    if (this.tween) this.tween.cancel();
    edge = Tessellator.float.forValue(edge);
    
    if (edge.length){
        this[0] = this[0] < edge[0] ? 0 : 1;
        this[1] = this[1] < edge[1] ? 0 : 1;
        this[2] = this[2] < edge[2] ? 0 : 1;
    }else{
        this[0] = this[0] < edge ? 0 : 1;
        this[1] = this[1] < edge ? 0 : 1;
        this[2] = this[2] < edge ? 0 : 1;
    };
    
    return this;
};

Tessellator.vec3.prototype.floor = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.floor(this[0]);
    this[1] = Math.floor(this[1]);
    this[2] = Math.floor(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.round = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.round(this[0]);
    this[1] = Math.round(this[1]);
    this[2] = Math.round(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.ceil = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.ceil(this[0]);
    this[1] = Math.ceil(this[1]);
    this[2] = Math.ceil(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.mod = function (vec){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = this[0] % vec[0];
        this[1] = this[1] % vec[1];
        this[2] = this[2] % vec[2];
    }else{
        this[0] = this[0] % vec;
        this[1] = this[1] % vec;
        this[2] = this[2] % vec;
    };
    
    return this;
};

Tessellator.vec3.prototype.clamp = function (min, max){
    if (this.tween) this.tween.cancel();
    min = Tessellator.float.forValue(min);
    max = Tessellator.float.forValue(max);
    
    if (!min.length) min = Tessellator.vec3(min);
    if (!max.length) max = Tessellator.vec3(max);
    
    this[0] = this[0] < min[0] ? min[0] : (this[0] > max[0] ? max[0] : this[0]);
    this[1] = this[1] < min[1] ? min[1] : (this[1] > max[1] ? max[1] : this[1]);
    this[2] = this[2] < min[2] ? min[2] : (this[2] > max[2] ? max[2] : this[2]);
    
    return this;
};

Tessellator.vec3.prototype.fract = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = this[0] - Math.floor(this[0]);
    this[1] = this[1] - Math.floor(this[1]);
    this[2] = this[2] - Math.floor(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.mix = function (vec3, l){
    if (this.tween) this.tween.cancel();
    if (vec3.tween) vec3.tween.update();
    
    l = Tessellator.float.forValue(l);
    
    if (l.length){
        this[0] = this[0] + l[0] * (vec3[0] - this[0]);
        this[1] = this[1] + l[1] * (vec3[1] - this[1]);
        this[2] = this[2] + l[2] * (vec3[2] - this[2]);
    }else{
        this[0] = this[0] + l * (vec3[0] - this[0]);
        this[1] = this[1] + l * (vec3[1] - this[1]);
        this[2] = this[2] + l * (vec3[2] - this[2]);
    };
    
    return this;
};

Tessellator.vec3.prototype.add = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] += vec[0];
            this[1] += vec[1];
            this[2] += vec[2];
        }else{
            this[0] += vec;
            this[1] += vec;
            this[2] += vec;
        };
    }else{
        this[0] += arguments[0];
        this[1] += arguments[1];
        this[2] += arguments[2];
    };
    
    return this;
};

Tessellator.vec3.prototype.subtract = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] -= vec[0];
            this[1] -= vec[1];
            this[2] -= vec[2];
        }else{
            this[0] -= vec;
            this[1] -= vec;
            this[2] -= vec;
        };
    }else{
        this[0] -= arguments[0];
        this[1] -= arguments[1];
        this[2] -= arguments[2];
    };
    
    return this;
};

Tessellator.vec3.prototype.multiply = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length === 3){
            this[0] *= vec[0];
            this[1] *= vec[1];
            this[2] *= vec[2];
        }else if (vec.length === 16){
            var x = this[0],
                y = this[1],
                z = this[2],
                w = vec[3] * x + vec[7] * y + vec[11] * z + vec[15];
            
            this[0] = (vec[ 0] * x + vec[ 4] * y + vec[ 8] * z + vec[12]) / w;
            this[1] = (vec[ 1] * x + vec[ 5] * y + vec[ 9] * z + vec[13]) / w;
            this[2] = (vec[ 2] * x + vec[ 6] * y + vec[10] * z + vec[14]) / w;
        }else if (vec.length === 9){
            var x = this[0],
                y = this[1],
                z = this[2];
            
            this[0] = vec[0] * x + vec[3] * y + vec[6] * z;
            this[1] = vec[1] * x + vec[4] * y + vec[7] * z;
            this[2] = vec[2] * x + vec[5] * y + vec[8] * z;
        }else{
            this[0] *= vec;
            this[1] *= vec;
            this[2] *= vec;
        };
    }else{
        this[0] *= arguments[0];
        this[1] *= arguments[1];
        this[2] *= arguments[2];
    };
    
    return this;
};

Tessellator.vec3.prototype.divide = function (){
    if (this.tween) this.tween.update();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] /= vec[0];
            this[1] /= vec[1];
            this[2] /= vec[2];
        }else{
            this[0] /= vec;
            this[1] /= vec;
            this[2] /= vec;
        };
    }else{
        this[0] /= arguments[0];
        this[1] /= arguments[1];
        this[2] /= arguments[2];
    };
    
    return this;
};

Tessellator.vec3.prototype.min = function (vec){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = Math.min(this[0], vec[0]);
        this[1] = Math.min(this[1], vec[1]);
        this[2] = Math.min(this[2], vec[2]);
    }else{
        this[0] = Math.min(this[0], vec);
        this[1] = Math.min(this[1], vec);
        this[2] = Math.min(this[2], vec);
    };
    
    return this;
};

Tessellator.vec3.prototype.max = function (vec){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = Math.max(this[0], vec[0]);
        this[1] = Math.max(this[1], vec[1]);
        this[2] = Math.max(this[2], vec[2]);
    }else{
        this[0] = Math.max(this[0], vec);
        this[1] = Math.max(this[1], vec);
        this[2] = Math.max(this[2], vec);
    };
    
    return this;
};

Tessellator.vec3.prototype.squaredDistance = function (vec){
    if (this.tween) this.tween.update();
    vec = Tessellator.float.forValue(vec);
    
    var x, y, z;
    
    if (vec.length){
        x = vec[0] - this[0];
        y = vec[1] - this[1];
        z = vec[2] - this[2];
    }else{
        x = vec - this[0];
        y = vec - this[1];
        z = vec - this[2];
    };
    
    return Tessellator.float(x * x + y * y + z * z);
};

Tessellator.vec3.prototype.distance = function (vec3){
    return this.squaredDistance(vec3).sqrt();
};

Tessellator.vec3.prototype.dot = function (vec){
    if (this.tween) this.tween.update();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        return Tessellator.float(this[0] * vec[0] + this[1] * vec[1] + this[2] * vec[2]);
    }else{
        return Tessellator.float(this[0] * vec + this[1] * vec + this[2] * vec);
    };
};

Tessellator.vec3.prototype.squaredLength = function (){
    return this.dot(this);
};

Tessellator.vec3.prototype.len = function (){
    return this.squaredLength().sqrt();
};

Tessellator.vec3.prototype.normalize = function (){
    if (this.tween) this.tween.cancel();
    
    var d = this.len();
    
    this[0] /= d[0];
    this[1] /= d[0];
    this[2] /= d[0];
    
    return this;
};

Tessellator.vec3.prototype.invert = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    this[2] = 1 / this[2];
    
    return this;
};

Tessellator.vec3.prototype.negate = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = -this[0];
    this[1] = -this[1];
    this[2] = -this[2];
    
    return this;
};

Tessellator.vec3.prototype.random = function (scale){
    if (scale === undefined){
        scale = 1;
    }else {
        scale = Tessellator.float.forValue(scale);
    };
    
    if (scale.length){
        this[0] = (Math.random() * 2 - 1) * scale[0];
        this[1] = (Math.random() * 2 - 1) * scale[1];
        this[2] = (Math.random() * 2 - 1) * scale[2];
    }else{
        this[0] = (Math.random() * 2 - 1) * scale;
        this[1] = (Math.random() * 2 - 1) * scale;
        this[2] = (Math.random() * 2 - 1) * scale;
    };
    
    return this;
};

Tessellator.vec3.prototype.cross = function (vec3){
    if (this.tween) this.tween.cancel();
    
    var x = this[0],
        y = this[1],
        z = this[2];
    
    this[0] = y * vec3[2] - z * vec3[1];
    this[1] = z * vec3[0] - x * vec3[2];
    this[2] = x * vec3[1] - y * vec3[0];
    
    return this;
};

Tessellator.vec3.prototype.pitchyaw = function (pitch, yaw){
    if (this.tween) this.tween.cancel();
    
    if (!yaw){
        if (pitch.tween) pitch.tween.update();
        
        yaw = pitch[1];
        pitch = pitch[0];
    }else{
        pitch = Tessellator.float.forValue(pitch);
        yaw = Tessellator.float.forValue(yaw);
    };
    
    var c = Math.cos(pitch);
    this[0] = c * Math.cos(yaw);
    this[1] = Math.sin(pitch);
    this[2] = c * Math.sin(-yaw);
    
    return this;
};

Tessellator.vec3.prototype.yawpitch = function (yaw, pitch){
    if (this.tween) this.tween.cancel();
    
    if (!pitch){
        if (yaw.tween) yaw.tween.update();
        
        pitch = yaw[1];
        yaw = yaw[0];
    }else{
        pitch = Tessellator.float.forValue(pitch);
        yaw = Tessellator.float.forValue(yaw);
    };
    
    var c = Math.cos(pitch);
    this[0] = c * Math.cos(yaw);
    this[1] = Math.sin(pitch);
    this[2] = c * Math.sin(-yaw);
    
    return this;
};

Tessellator.vec3.prototype.reflect = function (normal){
    var d = this.dot(normal).x * 2;
    
    this[0] -= d * normal[0];
    this[1] -= d * normal[1];
    this[2] -= d * normal[2];
    
    return this;
};

Tessellator.vec3.prototype.asin = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.asin(this[0]);
    this[1] = Math.asin(this[1]);
    this[2] = Math.asin(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.acos = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.acos(this[0]);
    this[1] = Math.acos(this[1]);
    this[2] = Math.acos(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.atan = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.atan(this[0]);
    this[1] = Math.atan(this[1]);
    this[2] = Math.atan(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.sin = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.sin(this[0]);
    this[1] = Math.sin(this[1]);
    this[2] = Math.sin(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.cos = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.cos(this[0]);
    this[1] = Math.cos(this[1]);
    this[2] = Math.cos(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.tan = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.tan(this[0]);
    this[1] = Math.tan(this[1]);
    this[2] = Math.tan(this[2]);
    
    return this;
};

Tessellator.vec3.prototype.createTween = function (){
    return this.tween = new Tessellator.Tween(this);
};

Tessellator.vec3.prototype.toString = function (){
    return "vec3(" + this[0] + ", " + this[1] + ", " + this[2] + ")";
};

(function (){
    var getSwizzle = function (vec, s){
        if (vec.tween) vec.tween.update();
        
        var k = s.length;
        
        if (k === 1){
            return vec[s.charCodeAt(0) - 120];
        }else{
            var v = new Float32Array(k);
            
            for (var i = 0; i < k; i++){
                v[i] = vec[s.charCodeAt(i) - 120];
            };
            
            if (k === 2){
                v.__proto__ = Tessellator.vec2.prototype;
            }else if (k === 3){
                v.__proto__ = Tessellator.vec3.prototype;
            }else if (k === 4){
                v.__proto__ = Tessellator.vec4.prototype;
            };
            
            return v;
        };
    };
    
    var setSwizzle = function (vec, s, v){
        if (vec.tween) vec.tween.cancel();
        
        v = Tessellator.float.forValue(v);
        var k = s.length;
        
        if (v.length){
            for (var i = 0; i < k; i++){
                vec[s.charCodeAt(i) - 120] = v[i];
            };
        }else{
            for (var i = 0; i < k; i++){
                vec[s.charCodeAt(i) - 120] = v;
            };
        };
    };
    
    var t = [0, -1, -1, -1];
    var c = {};
    
    main:while (true){
        (function (){
            var s = "";
            for (var i = 0; i < t.length; i++){
                switch (t[i]){
                    case 0: s += "x"; break;
                    case 1: s += "y"; break;
                    case 2: s += "z"; break;
                };
            };
            
            if (!c[s]){
                c[s] = {
                    get: function (){
                        return getSwizzle(this, s);
                    },
                    
                    set: function (v){
                        setSwizzle(this, s, v);
                    }
                };
            };
        })();
        
        t[t.length - 1]++;
        
        for (var i = t.length - 1; i >= 0; i--){
            if (t[i] === 3){
                t[i] = -1;
                
                if (i === 0){
                    break main;
                };
                
                t[i - 1]++;
            }else{
                break;
            };
        };
    };
    
    Object.defineProperties(Tessellator.vec3.prototype, c);
})();