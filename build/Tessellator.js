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


//strict mode can be used with this.
"use strict";

var Tessellator = function (canvas){
    if (!canvas){
        canvas = document.createElement("canvas");
        
        canvas.style.width = "100%";
        canvas.style.height = "100%";
    }else if (canvas.constructor === String){
        canvas = document.getElementById(canvas);
    }
    
    this.canvas = canvas;
    
    var contextArgs;
    
    if (arguments.length === 2){
        contextArgs = arguments[1];
    }else{
        contextArgs = Array.prototype.slice.call(arguments, 1);
    }
    
    if (contextArgs && contextArgs.renderTD){
        delete contextArgs.renderTD;
        
        this.renderCanvas = document.createElement("canvas");
        this.TD = this.canvas.getContext("2d");
    }else{
        this.renderCanvas = this.canvas;
    }
    
    try{
        var contexts;
        
        if (contextArgs && contextArgs.context){
            contexts = contextArgs.context;
            delete contextArgs.context;
        }else{
            contexts = [
                "webgl",
                "experimental-webgl"
            ];
        }
        
        if (contexts.length <= 0){
            throw "no contexts provided";
        }
        
        var context = null;
        
        for (var i = 0, k = contexts.length; i < k; i++){
            context = this.renderCanvas.getContext(contexts[i], contextArgs);
            
            if (context){
                this.context = contexts[i];
                break;
            }
        }
        
        if (context){
            this.GL = context;
        }else{
            var error = ["No contexts avaliable for "];
            
            for (var i = 0, k = contexts.length; i < k; i++){
                if (i === 0){
                    error.push(contexts[i]);
                }else if (i === k - 1){
                    error.push(" or ", contexts[i]);
                }else{
                    error.push(", ", contexts[i]);
                }
            }
            
            throw error.join("");
        }
        
        if (this.context == "experimental-webgl"){
            console.debug("Experimental webGL is being used!");
        }
    }catch (e){
        this.GL = null;
        
        throw "Failed to initialize Tessellator: " + e;
    }
    
    var self = this;
    
    this.forceCanvasResize = function (){
        self.originWidth = canvas.clientWidth;
        self.originHeight = canvas.clientHeight;
        
        self.width = self.originWidth * self.resolutionScale.x();
        self.height = self.originHeight * self.resolutionScale.y();
        
        if (self.renderCanvas){
            canvas.setAttribute("width", self.originWidth);
            canvas.setAttribute("height", self.originHeight);
            
            self.renderCanvas.setAttribute("width", self.width);
            self.renderCanvas.setAttribute("height", self.height);
        }else{
            canvas.setAttribute("width", self.width);
            canvas.setAttribute("height", self.height);
        }
        
        if (self.onresize){
            self.onresize(self.width, self.height);
        }
    }
    
    this.canvasResize = function () {
        if (canvas.clientWidth !== self.originWidth || canvas.clientHeight !== self.originHeight){
            self.forceCanvasResize();
        }
    }
    
    window.addEventListener("resize", this.canvasResize);
    
    this.resolutionScale = Tessellator.vec2(1);
    this.width = 0;
    this.height = 0;
    
    this.extensions = new Tessellator.Extensions(this);
    
    this.maxUniformSpace = this.GL.getParameter(this.GL.MAX_FRAGMENT_UNIFORM_VECTORS);
    this.maxTextures = this.GL.getParameter(this.GL.MAX_TEXTURE_IMAGE_UNITS);
    this.maxAttributes = this.GL.getParameter(this.GL.MAX_VERTEX_ATTRIBS);
    
    this.GL.blendFunc(Tessellator.BLEND_DEFAULT[0], Tessellator.BLEND_DEFAULT[1]);
    
    this.forceCanvasResize();
    
    //used when textures are referenced through strings. Not recommended.
    this.textureCache = {};
    this.unusedTextureID = [];
    
    this.frame = 0;
    
    this.contextID = Tessellator.contexts;
    Tessellator.contexts++;
    
    this.resources = [];
    this.resources.total = 0;
    
    this.resources.remove = function (resource){
        this.splice(this.indexOf(resource), 1);
    }
    
    this.resources.push = function (resource){
        resource.RESOURCE_TRACK = this.total++;
        
        this[this.length] = resource;
    }
    
    
    for (var i = 0; i < Tessellator.createHandle.length; i++){
        Tessellator.createHandle[i].call(this);
    }
}

Tessellator.VERSION = "5g beta";

Tessellator.VENDORS = [
    "",
    "WEBKIT_",
    "MOZ_",
    "O_",
    "MS_",
    "webkit",
    "moz",
    "o",
    "ms"
];

if (window.module){
    window.module.exports = Tessellator;
}

Tessellator.prototype.frameBuffer = null;
Tessellator.prototype.boundTexture = null;

Tessellator.contexts = 0;
Tessellator.createHandle = [];

Tessellator.prototype.dispose = function (){
   while (this.resources.length){
       this.resources[this.resources.length - 1].dispose();
   }
}

Tessellator.prototype.setResolutionScale = function (scale){
    if (scale.constructor === Tessellator.vec2){
        this.resolutionScale = scale;
    }else{
        this.resolutionScale = Tessellator.vec2(scale);
    }
    
    this.forceCanvasResize();
}

Tessellator.prototype.printLowLevelAccess = function (func){
    var self = this;
    
    if (func){
        var origional = this.GL[func];
        
        this.GL[func] = function (){
            var str = "GL " + func + ": [";
            
            for (var i = 0; i < arguments.length; i++){
                if (i == 0){
                    str += arguments[i];
                }else{
                    str += ", " + arguments[i];
                }
            }
            
            str += "]";
            
            console.debug(str);
            return origional.apply(self.GL, arguments);
        }
    }else{
        for (var o in this.GL){
            if (typeof(this.GL[o]) == "function"){
                this.printLowLevelAccess(o);
            }
        }
    }
}

Tessellator.prototype.countLowLevelAccess = function (func){
    this.gledits = 0;
    
    var self = this;
    
    if (func){
        var origional = this.GL[func];
        
        this.GL[func] = function (){
            self.gledits++;
            
            return origional.apply(self.GL, arguments);
        }
    }else{
        for (var o in this.GL){
            if (typeof(this.GL[o]) == "function"){
                this.countLowLevelAccess(o);
            }
        }
    }
}

Tessellator.prototype.getDataURL = function (){
    return this.canvas.toDataURL.apply(this.canvas, arguments);
}

Tessellator.prototype.preRender = function (){
    this.frame++;
    
    this.canvasResize();
    
    if (this.TD){
        this.TD.clearRect(0, 0, this.originWidth, this.originHeight);
    }
}

Tessellator.prototype.postRender = function (){
    if (this.TD){
        this.TD.drawImage(this.renderCanvas, 0, 0, this.originWidth, this.originHeight, 0, 0, this.width, this.height);
    }
}

Tessellator.prototype.super_preRender = Tessellator.prototype.preRender;
Tessellator.prototype.super_postRender = Tessellator.prototype.postRender;/**
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


//strict mode can be used with this.
"use strict";

Tessellator.vec4 = function (){
    var array = new Float32Array(4);
    var pos = 0;
    
    for (var i = 0, k = arguments.length; i < k; i++){
        var arg = arguments[i];
        
        if (isNaN(arg)){
            if (arg.tween) arg.tween.update();
            
            array.set(arg, pos);
            pos += arg.length;
        }else{
            array[pos++] = arg;
        }
    }
    
    if (pos === 1){
        array[1] = array[0];
        array[2] = array[0];
        array[3] = array[0];
    }else if (pos !== 0){
        if (pos < array.length){
            throw "too little information";
        }else if (pos > array.length){
            throw "too much information";
        }
    }
    
    array.__proto__ = Tessellator.vec4.prototype;
    
    return array;
}

Tessellator.vec4.prototype = Object.create(Float32Array.prototype);
Tessellator.vec4.prototype.constructor = Tessellator.vec4;

Tessellator.vec4.prototype.clear = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 0;
    this[1] = 0;
    this[3] = 0;
    this[2] = 0;
}

Tessellator.vec4.prototype.clone = function (){
    return Tessellator.vec4(this);
}

Tessellator.vec4.prototype.copy = function (vec4){
    if (vec4.tween) vec4.tween.update();
    
    this.set(vec4)
    
    return this;
}

Tessellator.vec4.prototype.exp = function(vec){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = Math.pow(this[0], vec[0]);
        this[1] = Math.pow(this[1], vec[1]);
        this[2] = Math.pow(this[2], vec[2]);
        this[3] = Math.pow(this[3], vec[3]);
    }else{
        this[0] = Math.pow(this[0], vec);
        this[1] = Math.pow(this[1], vec);
        this[2] = Math.pow(this[2], vec);
        this[3] = Math.pow(this[3], vec);
    }
    
    return this;
}

Tessellator.vec4.prototype.sqrt = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.sqrt(this[0]);
    this[1] = Math.sqrt(this[1]);
    this[2] = Math.sqrt(this[2]);
    this[3] = Math.sqrt(this[3]);
    
    return this;
}

Tessellator.vec4.prototype.inversesqrt = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 1 / Math.sqrt(this[0]);
    this[1] = 1 / Math.sqrt(this[1]);
    this[2] = 1 / Math.sqrt(this[2]);
    this[3] = 1 / Math.sqrt(this[3]);
    
    return this;
}

Tessellator.vec4.prototype.abs = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.abs(this[0]);
    this[1] = Math.abs(this[1]);
    this[2] = Math.abs(this[2]);
    this[3] = Math.abs(this[3]);
    
    return this;
}

Tessellator.vec4.prototype.sign = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = this[0] > 0 ? 1 : (this[0] < 0 ? -1 : this[0]);
    this[1] = this[1] > 0 ? 1 : (this[1] < 0 ? -1 : this[1]);
    this[2] = this[2] > 0 ? 1 : (this[2] < 0 ? -1 : this[2]);
    this[3] = this[3] > 0 ? 1 : (this[3] < 0 ? -1 : this[3]);
    
    return this;
}

Tessellator.vec4.prototype.step = function (edge){
    if (this.tween) this.tween.update();
    edge = Tessellator.float.forValue(edge);
    
    if (edge.length){
        this[0] = this[0] < edge[0] ? 0 : 1;
        this[1] = this[1] < edge[1] ? 0 : 1;
        this[2] = this[2] < edge[2] ? 0 : 1;
        this[3] = this[3] < edge[3] ? 0 : 1;
    }else{
        this[0] = this[0] < edge ? 0 : 1;
        this[1] = this[1] < edge ? 0 : 1;
        this[2] = this[2] < edge ? 0 : 1;
        this[3] = this[3] < edge ? 0 : 1;
    }
    
    return this;
}

Tessellator.vec4.prototype.floor = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.floor(this[0]);
    this[1] = Math.floor(this[1]);
    this[2] = Math.floor(this[2]);
    this[3] = Math.floor(this[3]);
    
    return this;
}

Tessellator.vec4.prototype.ceil = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.ceil(this[0]);
    this[1] = Math.ceil(this[1]);
    this[2] = Math.ceil(this[2]);
    this[3] = Math.ceil(this[3]);
    
    return this;
}

Tessellator.vec4.prototype.mod = function (vec){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = this[0] % vec[0];
        this[1] = this[1] % vec[1];
        this[2] = this[2] % vec[2];
        this[3] = this[3] % vec[3];
    }else{
        this[0] = this[0] % vec;
        this[1] = this[1] % vec;
        this[2] = this[2] % vec;
        this[3] = this[3] % vec;
    }
    
    return this;
}

Tessellator.vec4.prototype.clamp = function (min, max){
    if (this.tween) this.tween.cancel();
    min = Tessellator.float.forValue(min);
    max = Tessellator.float.forValue(max);
    
    if (!min.length) min = Tessellator.vec4(min);
    if (!max.length) max = Tessellator.vec4(max);
    
    this[0] = this[0] < min[0] ? min[0] : (this[0] > max[0] ? max[0] : this[0]);
    this[1] = this[1] < min[1] ? min[1] : (this[1] > max[0] ? max[1] : this[1]);
    this[2] = this[2] < min[2] ? min[2] : (this[2] > max[0] ? max[2] : this[2]);
    this[3] = this[3] < min[3] ? min[3] : (this[3] > max[0] ? max[3] : this[3]);
    
    return this;
}

Tessellator.vec4.prototype.fract = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = this[0] - Math.floor(this[0]);
    this[1] = this[1] - Math.floor(this[1]);
    this[2] = this[2] - Math.floor(this[2]);
    this[3] = this[3] - Math.floor(this[3]);
    
    return this;
}

Tessellator.vec4.prototype.mix = function (vec, l){
    if (this.tween) this.tween.update();
    l = Tessellator.float.forValue(l);
    
    if (l.length){
        this[0] = this[0] + l[0] * (vec4[0] - this[0]);
        this[1] = this[1] + l[1] * (vec4[1] - this[1]);
        this[2] = this[2] + l[2] * (vec4[2] - this[2]);
        this[3] = this[3] + l[3] * (vec4[3] - this[3]);
    }else{
        this[0] = this[0] + l * (vec4[0] - this[0]);
        this[1] = this[1] + l * (vec4[1] - this[1]);
        this[2] = this[2] + l * (vec4[2] - this[2]);
        this[3] = this[3] + l * (vec4[3] - this[3]);
    }
    
    return this;
}

Tessellator.vec4.prototype.add = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] += vec[0];
            this[1] += vec[1];
            this[2] += vec[2];
            this[3] += vec[3];
        }else{
            this[0] += vec;
            this[1] += vec;
            this[2] += vec;
            this[3] += vec;
        }
    }else{
        this[0] += arguments[0];
        this[1] += arguments[1];
        this[2] += arguments[2];
        this[3] += arguments[3];
    }
    
    return this;
}

Tessellator.vec4.prototype.subtract = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] -= vec[0];
            this[1] -= vec[1];
            this[2] -= vec[2];
            this[3] -= vec[3];
        }else{
            this[0] -= vec;
            this[1] -= vec;
            this[2] -= vec;
            this[3] -= vec;
        }
    }else{
        this[0] -= arguments[0];
        this[1] -= arguments[1];
        this[2] -= arguments[2];
        this[3] -= arguments[3];
    }
    
    return this;
}

Tessellator.vec4.prototype.multiply = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length === 16){
            var
                x = this[0],
                y = this[1],
                z = this[2],
                w = this[3];
            
            this[0] = vec[0] * x + vec[4] * y + vec[8 ] * z + vec[12] * w;
            this[1] = vec[1] * x + vec[5] * y + vec[9 ] * z + vec[13] * w;
            this[2] = vec[2] * x + vec[6] * y + vec[10] * z + vec[14] * w;
            this[3] = vec[3] * x + vec[7] * y + vec[11] * z + vec[15] * w;
        }else if (vec.length){
            this[0] *= vec[0];
            this[1] *= vec[1];
            this[2] *= vec[2];
            this[3] *= vec[3];
        }else{
            this[0] *= vec;
            this[1] *= vec;
            this[2] *= vec;
            this[3] *= vec;
        }
    }else{
        this[0] *= arguments[0];
        this[1] *= arguments[1];
        this[2] *= arguments[2];
        this[3] *= arguments[3];
    }
    
    return this;
}

Tessellator.vec4.prototype.divide = function (){
    if (this.tween) this.tween.update();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] /= vec[0];
            this[1] /= vec[1];
            this[2] /= vec[2];
            this[3] /= vec[3];
        }else{
            this[0] /= vec;
            this[1] /= vec;
            this[2] /= vec;
            this[3] /= vec;
        }
    }else{
        this[0] /= arguments[0];
        this[1] /= arguments[1];
        this[2] /= arguments[2];
        this[3] /= arguments[3];
    }
    
    return this;
}

Tessellator.vec4.prototype.min = function (vec){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = Math.min(this[0], vec[0]);
        this[1] = Math.min(this[1], vec[1]);
        this[2] = Math.min(this[2], vec[2]);
        this[3] = Math.min(this[3], vec[3]);
    }else{
        this[0] = Math.min(this[0], vec);
        this[1] = Math.min(this[1], vec);
        this[2] = Math.min(this[2], vec);
        this[3] = Math.min(this[3], vec);
    }
    
    return this;
}

Tessellator.vec4.prototype.max = function (vec){
    if (this.tween) this.tween.update();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = Math.max(this[0], vec[0]);
        this[1] = Math.max(this[1], vec[1]);
        this[2] = Math.max(this[2], vec[2]);
        this[3] = Math.max(this[3], vec[3]);
    }else{
        this[0] = Math.max(this[0], vec);
        this[1] = Math.max(this[1], vec);
        this[2] = Math.max(this[2], vec);
        this[3] = Math.max(this[3], vec);
    }
    
    return this;
}

Tessellator.vec4.prototype.squaredDistance = function (vec){
    if (this.tween) this.tween.update();
    vec = Tessellator.float.forValue(vec);
    
    var x, y, z, w;
    
    if (vec.length){
        x = vec[0] - this[0];
        y = vec[1] - this[1];
        z = vec[2] - this[2];
        w = vec[3] - this[3];
    }else{
        x = vec - this[0];
        y = vec - this[1];
        z = vec - this[2];
        w = vec - this[3];
    }
    
    return Tessellator.float(x * x + y * y + z * z + w * w);
}

Tessellator.vec4.prototype.distance = function (vec4){
    return this.squaredDistance(vec4).sqrt();
}

Tessellator.vec4.prototype.dot = function (vec){
    if (this.tween) this.tween.update();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        return Tessellator.float(this[0] * vec[0] + this[1] * vec[1] + this[2] * vec[2] + this[3] * vec[3]);
    }else{
        return Tessellator.float(this[0] * vec + this[1] * vec + this[2] * vec + this[3] * vec);
    }
}

Tessellator.vec4.prototype.squaredLength = function (){
    return this.dot(this);
}

Tessellator.vec4.prototype.len = function (){
    return this.squaredLength().sqrt();
}

Tessellator.vec4.prototype.normalize = function (){
    if (this.tween) this.tween.cancel();
    
    var d = this.len();
    this[0] /= d[0];
    this[1] /= d[0];
    this[2] /= d[0];
    this[3] /= d[0];
    
    return this;
}

Tessellator.vec4.prototype.invert = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    this[2] = 1 / this[2];
    this[3] = 1 / this[3];
    
    return this;
}

Tessellator.vec4.prototype.negate = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = -this[0];
    this[1] = -this[1];
    this[2] = -this[2];
    this[3] = -this[3];
    
    return this;
}

Tessellator.vec4.prototype.random = function (scale){
    if (this.tween) this.tween.cancel();
    
    if (scale === undefined){
        scale = 1;
    }else{
        scale = Tessellator.float.forValue(scale);
    }
    
    if (scale.length){
        this[0] = Math.random() * scale[0];
        this[1] = Math.random() * scale[1];
        this[2] = Math.random() * scale[2];
        this[3] = Math.random() * scale[3];

    }else{
        this[0] = Math.random() * scale;
        this[1] = Math.random() * scale;
        this[2] = Math.random() * scale;
        this[3] = Math.random() * scale;
    }
    
    return this;
}

Tessellator.vec4.prototype.x = function (){
    if (this.tween) this.tween.update();
    
    return this[0];
}

Tessellator.vec4.prototype.y = function (){
    if (this.tween) this.tween.update();
    
    return this[1];
}

Tessellator.vec4.prototype.z = function (){
    if (this.tween) this.tween.update();
    
    return this[2];
}

Tessellator.vec4.prototype.w = function (){
    if (this.tween) this.tween.update();
    
    return this[3];
}

Tessellator.vec4.prototype.createTween = function (){
    return this.tween = new Tessellator.Tween(this);
}

Tessellator.vec4.prototype.toString = function (){
    return "vec4(" + this[0] + ", " + this[1] + ", " + this[2] + ", " + this[3] + ")";
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.vec3 = function (){
    var array = new Float32Array(3);
    var pos = 0;
    
    for (var i = 0, k = arguments.length; i < k; i++){
        var arg = arguments[i];
        
        if (isNaN(arg)){
            if (arg.tween) arg.tween.update();
            
            array.set(arg, pos);
            pos += arg.length;
        }else{
            array[pos++] = arg;
        }
    }
    
    if (pos === 1){
        array[1] = array[0];
        array[2] = array[0];
    }else if (pos !== 0){
        if (pos < array.length){
            throw "too little information";
        }else if (pos > array.length){
            throw "too much information";
        }
    }
    
    array.__proto__ = Tessellator.vec3.prototype;
    
    return array;
}

Tessellator.vec3.prototype = Object.create(Float32Array.prototype);
Tessellator.vec3.prototype.constructor = Tessellator.vec3;

Tessellator.vec3.prototype.clear = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 0;
    this[1] = 0;
    this[3] = 0;
}

Tessellator.vec3.prototype.clone = function (){
    return Tessellator.vec3(this);
}

Tessellator.vec3.prototype.copy = function (vec3){
    if (this.tween) this.tween.cancel();
    if (vec3.tween) vec3.tween.update();
    
    this.set(vec3);
    
    return this;
}

Tessellator.vec3.prototype.exp = function(vec){
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
    }
    
    return this;
}

Tessellator.vec3.prototype.sqrt = function(){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.sqrt(this[0]);
    this[1] = Math.sqrt(this[1]);
    this[2] = Math.sqrt(this[2]);
    
    return this;
}

Tessellator.vec3.prototype.inversesqrt = function(){
    if (this.tween) this.tween.cancel();
    
    this[0] = 1 / Math.sqrt(this[0]);
    this[1] = 1 / Math.sqrt(this[1]);
    this[2] = 1 / Math.sqrt(this[2]);
    
    return this;
}

Tessellator.vec3.prototype.abs = function(){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.abs(this[0]);
    this[1] = Math.abs(this[1]);
    this[2] = Math.abs(this[2]);
    
    return this;
}

Tessellator.vec3.prototype.sign = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = this[0] > 0 ? 1 : (this[0] < 0 ? -1 : this[0]);
    this[1] = this[1] > 0 ? 1 : (this[1] < 0 ? -1 : this[1]);
    this[2] = this[2] > 0 ? 1 : (this[2] < 0 ? -1 : this[2]);
    
    return this;
}

Tessellator.vec3.prototype.rotate = function (matrix){
    if (this.tween) this.tween.cancel();
    
    var
        x = this[0],
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
    }
    
    return this;
}

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
    }
    
    return this;
}

Tessellator.vec3.prototype.floor = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.floor(this[0]);
    this[1] = Math.floor(this[1]);
    this[2] = Math.floor(this[2]);
    
    return this;
}

Tessellator.vec3.prototype.round = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.round(this[0]);
    this[1] = Math.round(this[1]);
    this[2] = Math.round(this[2]);
    
    return this;
}

Tessellator.vec3.prototype.ceil = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.ceil(this[0]);
    this[1] = Math.ceil(this[1]);
    this[2] = Math.ceil(this[2]);
    
    return this;
}

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
    }
    
    return this;
}

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
}

Tessellator.vec3.prototype.fract = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = this[0] - Math.floor(this[0]);
    this[1] = this[1] - Math.floor(this[1]);
    this[2] = this[2] - Math.floor(this[2]);
    
    return this;
}

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
    }
    
    return this;
}

Tessellator.vec3.prototype.add = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0])
        
        if (vec.length){
            this[0] += vec[0];
            this[1] += vec[1];
            this[2] += vec[2];
        }else{
            this[0] += vec;
            this[1] += vec;
            this[2] += vec;
        }
    }else{
        this[0] += arguments[0];
        this[1] += arguments[1];
        this[2] += arguments[2];
    }
    
    return this;
}

Tessellator.vec3.prototype.subtract = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0])
        
        if (vec.length){
            this[0] -= vec[0];
            this[1] -= vec[1];
            this[2] -= vec[2];
        }else{
            this[0] -= vec;
            this[1] -= vec;
            this[2] -= vec;
        }
    }else{
        this[0] -= arguments[0];
        this[1] -= arguments[1];
        this[2] -= arguments[2];
    }
    
    return this;
}

Tessellator.vec3.prototype.multiply = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0])
        
        if (vec.length === 3){
            this[0] *= vec[0];
            this[1] *= vec[1];
            this[2] *= vec[2];
        }else if (vec.length === 16){
            var
                x = this[0],
                y = this[1],
                z = this[2],
                w = vec[3] * x + vec[7] * y + vec[11] * z + vec[15];
            
            this[0] = (vec[ 0] * x + vec[ 4] * y + vec[ 8] * z + vec[12]) / w;
            this[1] = (vec[ 1] * x + vec[ 5] * y + vec[ 9] * z + vec[13]) / w;
            this[2] = (vec[ 2] * x + vec[ 6] * y + vec[10] * z + vec[14]) / w;
        }else if (vec.length === 9){
            var
                x = this[0],
                y = this[1],
                z = this[2];
            
            this[0] = vec[0] * x + vec[3] * y + vec[6] * z;
            this[1] = vec[1] * x + vec[4] * y + vec[7] * z;
            this[2] = vec[2] * x + vec[5] * y + vec[8] * z;
        }else{
            this[0] *= vec;
            this[1] *= vec;
            this[2] *= vec;
        }
    }else{
        this[0] *= arguments[0];
        this[1] *= arguments[1];
        this[2] *= arguments[2];
    }
    
    return this;
}

Tessellator.vec3.prototype.divide = function (){
    if (this.tween) this.tween.update();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0])
        
        if (vec.length){
            this[0] /= vec[0];
            this[1] /= vec[1];
            this[2] /= vec[2];
        }else{
            this[0] /= vec;
            this[1] /= vec;
            this[2] /= vec;
        }
    }else{
        this[0] /= arguments[0];
        this[1] /= arguments[1];
        this[2] /= arguments[2];
    }
    
    return this;
}

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
    }
    
    return this;
}

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
    }
    
    return this;
}

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
    }
    
    return Tessellator.float(x * x + y * y + z * z);
}

Tessellator.vec3.prototype.distance = function (vec3){
    return this.squaredDistance(vec3).sqrt();
}

Tessellator.vec3.prototype.dot = function (vec){
    if (this.tween) this.tween.update();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        return Tessellator.float(this[0] * vec[0] + this[1] * vec[1] + this[2] * vec[2]);
    }else{
        return Tessellator.float(this[0] * vec + this[1] * vec + this[2] * vec);
    }
}

Tessellator.vec3.prototype.squaredLength = function (){
    return this.dot(this);
}

Tessellator.vec3.prototype.len = function (){
    return this.squaredLength().sqrt();
}

Tessellator.vec3.prototype.normalize = function (){
    if (this.tween) this.tween.cancel();
    
    var d = this.len();
    
    this[0] /= d[0];
    this[1] /= d[0];
    this[2] /= d[0];
    
    return this;
}

Tessellator.vec3.prototype.invert = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    this[2] = 1 / this[2];
    
    return this;
}

Tessellator.vec3.prototype.negate = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = -this[0];
    this[1] = -this[1];
    this[2] = -this[2];
    
    return this;
}

Tessellator.vec3.prototype.random = function (scale){
    if (scale === undefined){
        scale = 1;
    }else {
        scale = Tessellator.float.forValue(scale);
    }
    
    if (scale.length){
        this[0] = Math.random() * scale[0];
        this[1] = Math.random() * scale[1];
        this[2] = Math.random() * scale[2];
    }else{
        this[0] = Math.random() * scale;
        this[1] = Math.random() * scale;
        this[2] = Math.random() * scale;
    }
    
    return this;
}

Tessellator.vec3.prototype.cross = function (vec3){
    if (this.tween) this.tween.cancel();
    
    var
        x = this[0],
        y = this[1],
        z = this[2];
    
    this[0] = y * vec3[2] - z * vec3[1];
    this[1] = z * vec3[0] - x * vec3[2];
    this[2] = x * vec3[1] - y * vec3[0];
    
    return this;
}

Tessellator.vec3.prototype.x = function (){
    if (this.tween) this.tween.update();
    
    return this[0];
}

Tessellator.vec3.prototype.y = function (){
    if (this.tween) this.tween.update();
    
    return this[1];
}

Tessellator.vec3.prototype.z = function (){
    if (this.tween) this.tween.update();
    
    return this[2];
}

Tessellator.vec3.prototype.pitchyaw = function (pitch, yaw){
    if (this.tween) this.tween.cancel();
    
    pitch = Tessellator.float.forValue(pitch);
    yaw = Tessellator.float.forValue(yaw);
    
    var c = Math.cos(pitch);
    this[0] = c * Math.cos(yaw);
    this[1] = Math.sin(pitch);
    this[2] = c * Math.sin(-yaw);
    
    return this;
}

Tessellator.vec3.prototype.createTween = function (){
    return this.tween = new Tessellator.Tween(this);
}

Tessellator.vec3.prototype.toString = function (){
    return "vec3(" + this[0] + ", " + this[1] + ", " + this[2] + ")";
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.vec2 = function (){
    var array = new Float32Array(2);
    var pos = 0;
    
    for (var i = 0, k = arguments.length; i < k; i++){
        var arg = arguments[i];
        
        if (isNaN(arg)){
            if (arg.tween) arg.tween.update();
            
            array.set(arg, pos);
            pos += arg.length;
        }else{
            array[pos++] = arg;
        }
    }
    
    if (pos === 1){
        array[1] = array[0];
    }else if (pos !== 0){
        if (pos < array.length){
            throw "too little information";
        }else if (pos > array.length){
            throw "too much information";
        }
    }
    
    array.__proto__ = Tessellator.vec2.prototype;
    
    return array;
}

Tessellator.vec2.prototype = Object.create(Float32Array.prototype);
Tessellator.vec2.prototype.constructor = Tessellator.vec2;

Tessellator.vec2.prototype.clear = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 0;
    this[1] = 0;
}

Tessellator.vec2.prototype.clone = function (){
    return Tessellator.vec2(this);
}

Tessellator.vec2.prototype.copy = function (vec2){
    if (vec2.tween) vec2.tween.update();
    
    this.set(vec2);
    
    return this;
}

Tessellator.vec2.prototype.exp = function(vec){
    if (this.tween) this.tween.cancel();
    if (vec.tween) vec.tween.update();
    
    this[0] = Math.pow(this[0], vec[0]);
    this[1] = Math.pow(this[1], vec[1]);
    
    return this;
}

Tessellator.vec2.prototype.sqrt = function(){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.sqrt(this[0]);
    this[1] = Math.sqrt(this[1]);
    
    return this;
}

Tessellator.vec2.prototype.inversesqrt = function(){
    if (this.tween) this.tween.cancel();
    
    this[0] = 1 / Math.sqrt(this[0]);
    this[1] = 1 / Math.sqrt(this[1]);
    
    return this;
}

Tessellator.vec2.prototype.abs = function(){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.abs(this[0]);
    this[1] = Math.abs(this[1]);
    
    return this;
}

Tessellator.vec2.prototype.sign = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = this[0] > 0 ? 1 : (this[0] < 0 ? -1 : this[0]);
    this[1] = this[1] > 0 ? 1 : (this[1] < 0 ? -1 : this[1]);
    
    return this;
}

Tessellator.vec2.prototype.step = function (edge){
    if (this.tween) this.tween.cancel();
    edge = Tessellator.float.forValue(edge);
    
    if (edge.length){
        this[0] = this[0] < edge[0] ? 0 : 1;
        this[1] = this[1] < edge[1] ? 0 : 1;
    }else{
        this[0] = this[0] < edge ? 0 : 1;
        this[1] = this[1] < edge ? 0 : 1;
    }
    
    return this;
}

Tessellator.vec2.prototype.floor = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.floor(this[0]);
    this[1] = Math.floor(this[1]);
    
    return this;
}

Tessellator.vec2.prototype.ceil = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.ceil(this[0]);
    this[1] = Math.ceil(this[1]);
    
    return this;
}

Tessellator.vec2.prototype.mod = function (vec){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = this[0] % vec[0];
        this[1] = this[1] % vec[1];
    }else{
        this[0] = this[0] % vec;
        this[1] = this[1] % vec;
    }
    
    return this;
}

Tessellator.vec2.prototype.clamp = function (min, max){
    if (this.tween) this.tween.cancel();
    min = Tessellator.float.forValue(min);
    max = Tessellator.float.forValue(max);
    
    if (!min.length) min = Tessellator.vec2(min);
    if (!max.length) max = Tessellator.vec2(max);
    
    this[0] = this[0] < min[0] ? min[0] : (this[0] > max[0] ? max[0] : this[0]);
    this[1] = this[1] < min[1] ? min[1] : (this[1] > max[1] ? max[1] : this[1]);
    
    return this;
}

Tessellator.vec2.prototype.fract = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = this[0] - Math.floor(this[0]);
    this[1] = this[1] - Math.floor(this[1]);
    
    return this;
}

Tessellator.vec2.prototype.mix = function (vec2, l){
    if (this.tween) this.tween.update();
    if (vec2.tween) vec2.tween.update();
    l = Tessellator.float.forValue(l);
    
    if (l.length){
        this[0] = this[0] + l[0] * (vec2[0] - this[0]);
        this[1] = this[1] + l[1] * (vec2[1] - this[1]);
    }else{
        this[0] = this[0] + l * (vec2[0] - this[0]);
        this[1] = this[1] + l * (vec2[1] - this[1]);
    }
    
    return this;
}

Tessellator.vec2.prototype.add = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] += vec[0];
            this[1] += vec[1];
        }else{
            this[0] += vec;
            this[1] += vec;
        }
    }else{
        this[0] += arguments[0];
        this[1] += arguments[1];
    }
    
    return this;
}

Tessellator.vec2.prototype.subtract = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] -= vec[0];
            this[1] -= vec[1];
        }else{
            this[0] -= vec;
            this[1] -= vec;
        }
    }else{
        this[0] -= arguments[0];
        this[1] -= arguments[1];
    }
    
    return this;
}

Tessellator.vec2.prototype.multiply = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] *= vec[0];
            this[1] *= vec[1];
        }else{
            this[0] *= vec;
            this[1] *= vec;
        }
    }else{
        this[0] *= arguments[0];
        this[1] *= arguments[1];
    }
    
    return this;
}

Tessellator.vec2.prototype.divide = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] /= vec[0];
            this[1] /= vec[1];
        }else{
            this[0] /= vec;
            this[1] /= vec;
        }
    }else{
        this[0] /= arguments[0];
        this[1] /= arguments[1];
    }
    
    return this;
}

Tessellator.vec2.prototype.min = function (vec){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = Math.min(this[0], vec[0]);
        this[1] = Math.min(this[1], vec[1]);
    }else{
        this[0] = Math.min(this[0], vec);
        this[1] = Math.min(this[1], vec);
    }
    
    return this;
}

Tessellator.vec2.prototype.max = function (vec2){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = Math.max(this[0], vec[0]);
        this[1] = Math.max(this[1], vec[1]);
    }else{
        this[0] = Math.max(this[0], vec);
        this[1] = Math.max(this[1], vec);
    }
    
    return this;
}

Tessellator.vec2.prototype.squaredDistance = function (vec){
    if (this.tween) this.tween.update();
    vec = Tessellator.float.forValue(vec);
    
    var x, y;
    
    if (vec.length){
        x = vec[0] - this[0];
        y = vec[1] - this[1];
    }else{
        x = vec - this[0];
        y = vec - this[1];
    }
    
    return Tessellator.float(x * x + y * y);
}

Tessellator.vec2.prototype.distance = function (vec){
    return this.squaredDistance(vec).sqrt();
}

Tessellator.vec2.prototype.dot = function (vec){
    if (this.tween) this.tween.update();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        return Tessellator.float(this[0] * vec[0] + this[1] * vec[1]);
    }else{
        return Tessellator.float(this[0] * vec + this[1] * vec);
    }
}

Tessellator.vec2.prototype.squaredLength = function (){
    return this.dot(this);
}

Tessellator.vec2.prototype.len = function (){
    return this.squaredLength().sqrt();
}

Tessellator.vec2.prototype.normalize = function (){
    if (this.tween) this.tween.cancel();
    
    var d = this.len();
    this[0] /= d[0];
    this[1] /= d[0];
    
    return this;
}

Tessellator.vec2.prototype.invert = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    
    return this;
}

Tessellator.vec2.prototype.negate = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = -this[0];
    this[1] = -this[1];
    
    return this;
}

Tessellator.vec2.prototype.random = function (scale){
    if (scale === undefined){
        scale = 1;
    }else {
        scale = Tessellator.float.forValue(scale);
    }
    
    if (scale.length){
        this[0] = Math.random() * scale[0];
        this[1] = Math.random() * scale[1];
    }else{
        this[0] = Math.random() * scale;
        this[1] = Math.random() * scale;
    }
    
    return this;
}

Tessellator.vec2.prototype.aspect = function (){
    if (this.tween) this.tween.update();
    
    return this[0] / this[1];
}

Tessellator.vec2.prototype.x = function (){
    if (this.tween) this.tween.update();
    
    return this[0];
}

Tessellator.vec2.prototype.y = function (){
    if (this.tween) this.tween.update();
    
    return this[1];
}

Tessellator.vec2.prototype.createTween = function (){
    return this.tween = new Tessellator.Tween(this);
}

Tessellator.vec2.prototype.toString = function (){
    return "vec2(" + this[0] + ", " + this[1] + ")";
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.float = function (){
    var array = new Float32Array(1);
    
    if (arguments.length === 0){
        array[0] = 0;
    }else if (arguments.length === 1){
        var arg = arguments[0];
        
        if (arg.length){
            if (arg.length === 1){
                if (arg.tween) arg.tween.update();
                
                array[0] = arg[0];
            }else{
                throw "too much information";
            }
        }else{
            array[0] = arg;
        }
    }else{
        throw "too much information";
    }
    
    array.__proto__ = Tessellator.float.prototype;
    
    return array;
}

Tessellator.float.forValue = function (value){
    if (value.length){
        if (value.tween){
            value.tween.update();
        }
        
        if (value.length === 1){
            return value[0];
        }else{
            return value;
        }
    }else{
        return value;
    }
}

Tessellator.float.prototype = Object.create(Float32Array.prototype);
Tessellator.float.prototype.constructor = Tessellator.float;

Tessellator.float.prototype.clear = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 0;
    
    return this;
}

Tessellator.float.prototype.clone = function (){
    return Tessellator.float(this);
}

Tessellator.float.prototype.copy = function (float){
    if (this.tween) this.tween.cancel();
    
    this[0] = Tessellator.float.forValue(float);
}

Tessellator.float.prototype.multiply = function (float){
    if (this.tween) this.tween.cancel();
    
    this[0] *= Tessellator.float.forValue(float);
    
    return this;
}

Tessellator.float.prototype.add = function (float){
    if (this.tween) this.tween.cancel();
    
    this[0] += Tessellator.float.forValue(float);
    
    return this;
}

Tessellator.float.prototype.subtract = function (float) {
    if (this.tween) this.tween.cancel();
    
    this[0] -= Tessellator.float.forValue(float);
    
    return this;
}

Tessellator.float.prototype.divide = function (float) {
    if (this.tween) this.tween.cancel();
    
    this[0] /= Tessellator.float.forValue(float[0]);
    
    return this;
}

Tessellator.float.prototype.sqrt = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.sqrt(this[0]);
    
    return this;
}

Tessellator.float.prototype.square = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] *= this[0];
    
    return this;
}

Tessellator.float.prototype.cube = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] *= this[0] * this[0];
    
    return this;
}

Tessellator.float.prototype.min = function (min){
    if (this.tween) this.tween.cancel();
    min = Tessellator.float.forValue(min);
    
    this[0] = Math.min(min, this[0]);
    
    return this;
}

Tessellator.float.prototype.max = function (min){
    if (this.tween) this.tween.cancel();
    max = Tessellator.float.forValue(max);
    
    this[0] = Math.max(max, this[0]);
    
    return this;
}

Tessellator.float.prototype.fract = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = this[0] - Math.floor(this[0]);
    
    return this;
}

Tessellator.float.prototype.negate = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = -this[0];
    
    return this;
}

Tessellator.float.prototype.invert = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 1 / this[0];
    
    return this;
}

Tessellator.float.prototype.inversesqrt = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 1 / Math.sqrt(this[0]);
    
    return this;
}

Tessellator.float.prototype.round = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.round(this[0]);
    
    return this;
}

Tessellator.float.prototype.ceil = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.ceil(this[0]);
    
    return this;
}

Tessellator.float.abs = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.abs(this[0]);
    
    return this;
}

Tessellator.float.mix = function (float, l){
    if (this.tween) this.tween.cancel();
    
    float = Tessellator.float.forValue(float);
    l = Tessellator.float.forValue(l);
    
    this[0] = this[0] * (1 - l) + float * l;
    
    return this;
}

Tessellator.float.sign = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = this[0] < 0 ? -1 : (this[0] > 0 ? 1 : this[0]);
    
    return this;
}

Tessellator.float.step = function (edge){
    if (this.tween) this.tween.cancel();
    edge = Tessellator.float.forValue(edge);
    
    this[0] = this[0] < edge ? 0 : 1;
    
    return this;
}

Tessellator.float.mod = function (float){
    if (this.tween) this.tween.cancel();
    float = Tessellator.float.forValue(float);
    
    this[0] = this[0] % float;
    
    return this;
}

Tessellator.float.clamp = function (min, max){
    if (this.tween) this.tween.cancel();
    min = Tessellator.float.forValue(min);
    max = Tessellator.float.forValue(max);
    
    this[0] = this[0] < min ? min : (this[0] > max ? max : this[0]);
    
    return this;
}

Tessellator.float.prototype.random = function (scale){
    if (this.tween) this.tween.update();
    
    if (scale === undefined){
        scale = 1;
    }else{
        scale = Tessellator.float.forValue(scale);
    }
    
    this[0] = Math.random() * scale;
    
    return this;
}

Tessellator.float.prototype.x = function (){
    if (this.tween) this.tween.update();
    
    return this[0];
}

Tessellator.float.prototype.createTween = function (){
    return this.tween = new Tessellator.Tween(this);
}

Tessellator.float.prototype.toString = function (){
    return "float(" + this[0] + ")";
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Tween = function (vec){
    this.vec = vec;
    
    this.directives = [];
    this.directiveStartTime = null;
    this.loopDirectives = false;
    
    this.updated = false;
}

Tessellator.Tween.prototype.getVec = function (){
    return this.vec;
}

Tessellator.Tween.prototype.cancel = function (){
    if (!this.updating){
        this.update();
        
        this.directives = [];
        
        this.loopDirectives = false;
    }
}

Tessellator.Tween.prototype.add = function (e){
    this.directives.push(e);
    
    if (this.directives.length === 1){
        this.directiveStartTime = Date.now();
        this.ovec = this.vec.clone();
    }
}

Tessellator.Tween.prototype.loop = function (flag){
    this.loopDirectives = flag === undefined ? true : flag;
    
    return this;
}

Tessellator.Tween.prototype.update = function (){
    if (!this.updating && this.time != this.updated && this.ovec){
        this.updating = true;
        
        var time = Date.now();
        
        while (this.directives.length){
            this.updated = time;
            
            var st = this.directives[0](this, time - this.directiveStartTime);
            
            if (st >= 0){
                var e = this.directives.splice(0, 1)[0];
                
                if (this.loopDirectives){
                    this.add(e);
                }
                
                if (this.directives.length){
                    this.ovec = this.vec.clone();
                    this.directiveStartTime = time - st;
                }
            }else{
                break;
            }
        }
        
        this.updating = false;
    }
}

Tessellator.Tween.prototype.dir = function (vec, time){
    time = Tessellator.float.forValue(time || 0);
    
    if (!isNaN(vec)){
        vec = Tessellator.float(vec);
    }
    
    if (time <= 0){
        this.add(function (tween, t){
            for (var i = 0; i < tween.vec.length; i++){
                tween.vec[i] = tween.ovec[i] + t * vec[i];
            }
            
            return -1;
        });
    }else{
        this.add(function (tween, t){
            for (var i = 0; i < tween.vec.length; i++){
                tween.vec[i] = tween.ovec[i] + Math.min(t / time, 1) * vec[i];
            }
            
            return t - time;
        });
    }
    
    return this;
}

Tessellator.Tween.prototype.to = function (pos, rate){
    rate = Tessellator.float.forValue(rate || 0);
    
    if (!isNaN(pos)){
        pos = Tessellator.float(pos);
    }
    
    this.add(function (tween, t){
        var vec = pos.clone().subtract(tween.ovec).divide(rate);
        
        for (var i = 0; i < tween.vec.length; i++){
            tween.vec[i] = tween.ovec[i] + Math.min(t, rate) * vec[i];
        }
        
        return t - rate;
    });
    
    return this;
}

Tessellator.Tween.prototype.set = function (pos){
    if (!isNaN(pos)){
        pos = Tessellator.float(pos);
    }
    
    this.add(function (tween){
        tween.vec.set(pos);
        
        return 0;
    });
    
    return this;
}

Tessellator.Tween.prototype.delay = function (time){
    this.add(function (tween, t){
        return t - time;
    });
    
    return this;
}

Tessellator.Tween.prototype.sin = function (amp, frq, time){
    time = Tessellator.float.forValue(time || 0);
    
    if (!isNaN(amp)){
        amp = Tessellator.float(amp);
    }
    
    if (!isNaN(frq)){
        frq = Tessellator.float(frq);
    }
    
    if (time <= 0){
        this.add(function (tween, t){
            for (var i = 0; i < tween.vec.length; i++){
                tween.vec[i] = tween.ovec[i] + Math.sin(t / 1000 * frq[0] * Math.PI * 2) * amp[i];
            }
            
            return -1;
        });
    }else{
        this.add(function (tween, t){
            for (var i = 0; i < tween.vec.length; i++){
                tween.vec[i] = tween.ovec[i] + Math.sin(Math.min(t, time) / 1000 * frq[0] * Math.PI * 2) * amp[i];
            }
            
            return t - time;
        });
    }
    
    return this;
}

Tessellator.Tween.prototype.cos = function (amp, frq, time){
    time = Tessellator.float.forValue(time || 0);
    
    if (!isNaN(amp)){
        amp = Tessellator.float(amp);
    }
    
    if (!isNaN(frq)){
        frq = Tessellator.float(frq);
    }
    
    if (time <= 0){
        this.add(function (tween, t){
            for (var i = 0; i < tween.vec.length; i++){
                tween.vec[i] = tween.ovec[i] + Math.cos(t / 1000 * frq[0] * Math.PI * 2) * amp[i];
            }
            
            return -1;
        });
    }else{
        this.add(function (tween, t){
            for (var i = 0; i < tween.vec.length; i++){
                tween.vec[i] = tween.ovec[i] + Math.cos(Math.min(t, time) / 1000 * frq[0] * Math.PI * 2) * amp[i];
            }
            
            return t - time;
        });
    }
    
    return this;
}

Tessellator.Tween.prototype.rad = function (start, cycles, rsin, rcos, time){
    time = Tessellator.float.forValue(time || 0);
    
    if (!isNaN(start)){
        start = Tessellator.float(start);
    }
    
    if (!isNaN(cycles)){
        cycles = Tessellator.float(cycles);
    }
    
    if (time <= 0){
        this.add(function (tween, t){
            for (var i = 0; i < tween.vec.length; i++){
                tween.vec[i] = tween.ovec[i] + 
                    Math.sin(t / 1000 * cycles[0] * Math.PI * 2 + start[0] * Math.PI * 2) * rsin[i] +
                    Math.cos(t / 1000 * cycles[0] * Math.PI * 2 + start[0] * Math.PI * 2) * rcos[i];
            }
            
            return -1;
        });
    }else{
        this.add(function (tween, t){
            for (var i = 0; i < tween.vec.length; i++){
                tween.vec[i] = tween.ovec[i] + 
                    Math.sin(Math.min(t / time, 1) * cycles[0] * Math.PI * 2 + start[0] * Math.PI * 2) * rsin[i] +
                    Math.cos(Math.min(t / time, 1) * cycles[0] * Math.PI * 2 + start[0] * Math.PI * 2) * rcos[i];
            }
            
            return t - time;
        });
    }
    
    return this;
}

Tessellator.Tween.prototype.addAll = function (){
    var vecs = Array.prototype.slice.call(arguments);
    
    for (var i = 0; i < vecs.length; i++){
        if (!isNaN(vecs[i])){
            vecs[i] = Tessellator.float(vecs[i]);
        }
    }
    
    this.add(function (tween){
        for (var i = 0; i < vecs.length; i++){
            if (vecs[i].tween){
                vecs[i].tween.update();
            }
        }
        
        for (var i = 0; i < tween.vec.length; i++){
            var x = tween.ovec[i];
            
            for (var ii = 0; ii < vecs.length; ii++){
                x += vecs[ii][i];
            }
            
            tween.vec[i] = x;
        }
        
        return -1;
    });
    
    return this;
}

Tessellator.Tween.prototype.multiplyAll = function (){
    var vecs = Array.prototype.slice.call(arguments);
    
    for (var i = 0; i < vecs.length; i++){
        if (!isNaN(vecs[i])){
            vecs[i] = Tessellator.float(vecs[i]);
        }
    }
    
    this.add(function (tween){
        for (var i = 0; i < vecs.length; i++){
            if (vecs[i].tween){
                vecs[i].tween.update();
            }
        }
        
        for (var i = 0; i < tween.vec.length; i++){
            var x = tween.ovec[i];
            
            for (var ii = 0; ii < vecs.length; ii++){
                x *= vecs[ii][i];
            }
            
            tween.vec[i] = x;
        }
        
        return -1;
    });
    
    return this;
}

Tessellator.Tween.prototype.divideAll = function (){
    var vecs = Array.prototype.slice.call(arguments);
    
    for (var i = 0; i < vecs.length; i++){
        if (!isNaN(vecs[i])){
            vecs[i] = Tessellator.float(vecs[i]);
        }
    }
    
    this.add(function (tween){
        for (var i = 0; i < vecs.length; i++){
            if (vecs[i].tween){
                vecs[i].tween.update();
            }
        }
        
        for (var i = 0; i < tween.vec.length; i++){
            var x = tween.ovec[i];
            
            for (var ii = 0; ii < vecs.length; ii++){
                x /= vecs[ii][i];
            }
            
            tween.vec[i] = x;
        }
        
        return -1;
    });
    
    return this;
}

Tessellator.Tween.prototype.subtractAll = function (){
    var vecs = Array.prototype.slice.call(arguments);
    
    for (var i = 0; i < vecs.length; i++){
        if (!isNaN(vecs[i])){
            vecs[i] = Tessellator.float(vecs[i]);
        }
    }
    
    this.add(function (tween){
        for (var i = 0; i < vecs.length; i++){
            if (vecs[i].tween){
                vecs[i].tween.update();
            }
        }
        
        for (var i = 0; i < tween.vec.length; i++){
            var x = tween.ovec[i];
            
            for (var ii = 0; ii < vecs.length; ii++){
                x -= vecs[ii][i];
            }
            
            tween.vec[i] = x;
        }
        
        return -1;
    });
    
    return this;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.mat4 = function (){
    var array = new Float32Array(16);
    
    var pos = 0;
    
    for (var i = 0, k = arguments.length; i < k; i++){
        var arg = arguments[i];
        
        if (typeof arg != "number"){
            array.set(arg, pos);
            pos += arg.length;
        }else{
            array[pos++] = arg;
        }
    }
    
    if (pos === 0){
        array[ 0] = 1;
        array[ 5] = 1;
        array[10] = 1;
        array[15] = 1;
    }else if (pos === 1){
        array[5] = array[0];
        array[10] = array[0];
        array[15] = array[0];
    }else{
        if (pos < array.length){
            throw "too little information";
        }else if (pos > array.length){
            throw "too much information";
        }
    }
    
    array.__proto__ = Tessellator.mat4.prototype;
    
    return array;
}

Tessellator.mat4.prototype = Object.create(Float32Array.prototype);
Tessellator.mat4.prototype.constructor = Tessellator.mat4;

Tessellator.mat4.prototype.random = function (scale){
    if (scale === undefined){
        scale = Tessellator.float(1);
    }else if (scale.tween){
        scale.tween.update();
    }
    
    this[ 0] = Math.random() * scale[0];
    this[ 1] = Math.random() * scale[0];
    this[ 2] = Math.random() * scale[0];
    this[ 3] = Math.random() * scale[0];
    
    this[ 4] = Math.random() * scale[0];
    this[ 5] = Math.random() * scale[0];
    this[ 6] = Math.random() * scale[0];
    this[ 7] = Math.random() * scale[0];
    
    this[ 8] = Math.random() * scale[0];
    this[ 9] = Math.random() * scale[0];
    this[10] = Math.random() * scale[0];
    this[11] = Math.random() * scale[0];
    
    this[12] = Math.random() * scale[0];
    this[13] = Math.random() * scale[0];
    this[14] = Math.random() * scale[0];
    this[15] = Math.random() * scale[0];
    
    return this;
}

Tessellator.mat4.prototype.clone = function (){
    return Tessellator.mat4(this);
}

Tessellator.mat4.prototype.copy = function (copy){
    if (copy.length === 16){
        this.set(copy);
    }else if (copy.length === 9){
        this[ 0] = copy[0];
        this[ 1] = copy[1];
        this[ 2] = copy[2];
        this[ 3] = 0;
        
        this[ 4] = copy[3];
        this[ 5] = copy[4];
        this[ 6] = copy[5];
        this[ 7] = 0;
        
        this[ 8] = copy[6];
        this[ 9] = copy[7];
        this[10] = copy[8];
        this[11] = 0;
        
        this[12] = 0;
        this[13] = 0;
        this[14] = 0;
        this[15] = 1;
    }else if (copy.length === 4){
        this[ 0] = copy[0];
        this[ 1] = copy[1];
        this[ 2] = 0;
        this[ 3] = 0;
        
        this[ 4] = copy[2];
        this[ 5] = copy[3];
        this[ 6] = 0;
        this[ 7] = 0;
        
        this[ 8] = 0;
        this[ 9] = 0;
        this[10] = 1;
        this[11] = 0;
        
        this[12] = 0;
        this[13] = 0;
        this[14] = 0;
        this[15] = 1;
    }else{
        throw "invalid arguments";
    }
    
    return this;
}

Tessellator.mat4.prototype.multiply = function (mat){
    if (mat.constructor === Tessellator.mat4){
        var
            x00 = this[ 0],
            x01 = this[ 1],
            x02 = this[ 2],
            x03 = this[ 3],
            x10 = this[ 4],
            x11 = this[ 5],
            x12 = this[ 6],
            x13 = this[ 7],
            x20 = this[ 8],
            x21 = this[ 9],
            x22 = this[10],
            x23 = this[11],
            x30 = this[12],
            x31 = this[13],
            x32 = this[14],
            x33 = this[15],
            
            y00 = mat[ 0],
            y01 = mat[ 1],
            y02 = mat[ 2],
            y03 = mat[ 3],
            y10 = mat[ 4],
            y11 = mat[ 5],
            y12 = mat[ 6],
            y13 = mat[ 7],
            y20 = mat[ 8],
            y21 = mat[ 9],
            y22 = mat[10],
            y23 = mat[11],
            y30 = mat[12],
            y31 = mat[13],
            y32 = mat[14],
            y33 = mat[15];
        
        this[ 0] = y00 * x00 + y01 * x10 + y02 * x20 + y03 * x30;
        this[ 1] = y00 * x01 + y01 * x11 + y02 * x21 + y03 * x31;
        this[ 2] = y00 * x02 + y01 * x12 + y02 * x22 + y03 * x32;
        this[ 3] = y00 * x03 + y01 * x13 + y02 * x23 + y03 * x33;
        
        this[ 4] = y10 * x00 + y11 * x10 + y12 * x20 + y13 * x30;
        this[ 5] = y10 * x01 + y11 * x11 + y12 * x21 + y13 * x31;
        this[ 6] = y10 * x02 + y11 * x12 + y12 * x22 + y13 * x32;
        this[ 7] = y10 * x03 + y11 * x13 + y12 * x23 + y13 * x33;
        
        this[ 8] = y20 * x00 + y21 * x10 + y22 * x20 + y23 * x30;
        this[ 9] = y20 * x01 + y21 * x11 + y22 * x21 + y23 * x31;
        this[10] = y20 * x02 + y21 * x12 + y22 * x22 + y23 * x32;
        this[11] = y20 * x03 + y21 * x13 + y22 * x23 + y23 * x33;
        
        this[12] = y30 * x00 + y31 * x10 + y32 * x20 + y33 * x30;
        this[13] = y30 * x01 + y31 * x11 + y32 * x21 + y33 * x31;
        this[14] = y30 * x02 + y31 * x12 + y32 * x22 + y33 * x32;
        this[15] = y30 * x03 + y31 * x13 + y32 * x23 + y33 * x33;
    }else if (mat.constructor === Tessellator.mat3){
        var
            x00 = this[ 0],
            x01 = this[ 1],
            x02 = this[ 2],
            x03 = this[ 3],
            x10 = this[ 4],
            x11 = this[ 5],
            x12 = this[ 6],
            x13 = this[ 7],
            x20 = this[ 8],
            x21 = this[ 9],
            x22 = this[10],
            x23 = this[11],
            
            y00 = mat[0],
            y01 = mat[1],
            y02 = mat[2],
            
            y10 = mat[3],
            y11 = mat[4],
            y12 = mat[5],
            
            y20 = mat[6],
            y21 = mat[7],
            y22 = mat[8];
        
        this[ 0] = y00 * x00 + y01 * x10 + y02 * x20;
        this[ 1] = y00 * x01 + y01 * x11 + y02 * x21;
        this[ 2] = y00 * x02 + y01 * x12 + y02 * x22;
        this[ 3] = y00 * x03 + y01 * x13 + y02 * x23;
        
        this[ 4] = y10 * x00 + y11 * x10 + y12 * x20;
        this[ 5] = y10 * x01 + y11 * x11 + y12 * x21;
        this[ 6] = y10 * x02 + y11 * x12 + y12 * x22;
        this[ 7] = y10 * x03 + y11 * x13 + y12 * x23;
        
        this[ 8] = y20 * x00 + y21 * x10 + y22 * x20;
        this[ 9] = y20 * x01 + y21 * x11 + y22 * x21;
        this[10] = y20 * x02 + y21 * x12 + y22 * x22;
        this[11] = y20 * x03 + y21 * x13 + y22 * x23;
    }else if (mat.constructor === Tessellator.mat2){
        var
            x00 = this[ 0],
            x01 = this[ 1],
            x02 = this[ 2],
            x03 = this[ 3],
            x10 = this[ 4],
            x11 = this[ 5],
            x12 = this[ 6],
            x13 = this[ 7],
            
            y00 = mat3[0],
            y01 = mat3[1],
            
            y10 = mat3[2],
            y11 = mat3[3];
        
        this[ 0] = y00 * x00 + y01 * x10;
        this[ 1] = y00 * x01 + y01 * x11;
        this[ 2] = y00 * x02 + y01 * x12;
        this[ 3] = y00 * x03 + y01 * x13;
        
        this[ 4] = y10 * x00 + y11 * x10;
        this[ 5] = y10 * x01 + y11 * x11;
        this[ 6] = y10 * x02 + y11 * x12;
        this[ 7] = y10 * x03 + y11 * x13;
    }else{
        throw "invalid arguments";
    }
    
    return this;
}

Tessellator.mat4.prototype.transpose = function (){
    var
        x01 = this[ 1],
        x02 = this[ 2],
        x03 = this[ 3],
        
        x10 = this[ 4],
        x12 = this[ 6],
        x13 = this[ 7],
        
        x20 = this[ 8],
        x21 = this[ 9],
        x23 = this[11],
        
        x30 = this[12],
        x31 = this[13],
        x32 = this[14];
    
    this[ 1] = x10;
    this[ 2] = x20;
    this[ 3] = x30;
    
    this[ 4] = x01;
    this[ 6] = x21;
    this[ 7] = x31;
    
    this[ 8] = x02;
    this[ 9] = x12;
    this[11] = x32;
    
    this[12] = x03;
    this[13] = x13;
    this[14] = x23;
    
    return this;
}

Tessellator.mat4.prototype.invert = function (){
    var
        x00 = this[ 0],
        x01 = this[ 1],
        x02 = this[ 2],
        x03 = this[ 3],
        x10 = this[ 4],
        x11 = this[ 5],
        x12 = this[ 6],
        x13 = this[ 7],
        x20 = this[ 8],
        x21 = this[ 9],
        x22 = this[10],
        x23 = this[11],
        x30 = this[12],
        x31 = this[13],
        x32 = this[14],
        x33 = this[15];
    
    var
        y00 = x00 * x11 - x01 * x10,
        y01 = x00 * x12 - x02 * x10,
        y02 = x00 * x13 - x03 * x10,
        y03 = x01 * x12 - x02 * x11,
        y04 = x01 * x13 - x03 * x11,
        y05 = x02 * x13 - x03 * x12,
        y06 = x20 * x31 - x21 * x30,
        y07 = x20 * x32 - x22 * x30,
        y08 = x20 * x33 - x23 * x30,
        y09 = x21 * x32 - x22 * x31,
        y10 = x21 * x33 - x23 * x31,
        y11 = x22 * x33 - x23 * x32;
    
    var d = y00 * y11 - y01 * y10 + y02 * y09 + y03 * y08 - y04 * y07 + y05 * y06;
    
    this[ 0] = (x11 * y11 - x12 * y10 + x13 * y09) / d;
    this[ 1] = (x02 * y10 - x01 * y11 - x03 * y09) / d;
    this[ 2] = (x31 * y05 - x32 * y04 + x33 * y03) / d;
    this[ 3] = (x22 * y04 - x21 * y05 - x23 * y03) / d;
    this[ 4] = (x12 * y08 - x10 * y11 - x13 * y07) / d;
    this[ 5] = (x00 * y11 - x02 * y08 + x03 * y07) / d;
    this[ 6] = (x32 * y02 - x30 * y05 - x33 * y01) / d;
    this[ 7] = (x20 * y05 - x22 * y02 + x23 * y01) / d;
    this[ 8] = (x10 * y10 - x11 * y08 + x13 * y06) / d;
    this[ 9] = (x01 * y08 - x00 * y10 - x03 * y06) / d;
    this[10] = (x30 * y04 - x31 * y02 + x33 * y00) / d;
    this[11] = (x21 * y02 - x20 * y04 - x23 * y00) / d;
    this[12] = (x11 * y07 - x10 * y09 - x12 * y06) / d;
    this[13] = (x00 * y09 - x01 * y07 + x02 * y06) / d;
    this[14] = (x31 * y01 - x30 * y03 - x32 * y00) / d;
    this[15] = (x20 * y03 - x21 * y01 + x22 * y00) / d;
    
    return this;
}

Tessellator.mat4.prototype.adjoint = function(joint) {
    var
        a00 = joint[ 0],
        a01 = joint[ 1],
        a02 = joint[ 2],
        a03 = joint[ 3],
        a10 = joint[ 4],
        a11 = joint[ 5],
        a12 = joint[ 6],
        a13 = joint[ 7],
        a20 = joint[ 8],
        a21 = joint[ 9],
        a22 = joint[10],
        a23 = joint[11],
        a30 = joint[12],
        a31 = joint[13],
        a32 = joint[14],
        a33 = joint[15];


    this[ 0] =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    this[ 1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    this[ 2] =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    this[ 3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    this[ 4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    this[ 5] =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    this[ 6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    this[ 7] =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    this[ 8] =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    this[ 9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    this[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    this[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    this[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    this[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    this[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    this[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    
    return this;
}

Tessellator.mat4.prototype.translate = function (vec3){
    if (vec3.tween){
        vec3.tween.update();
    }
    
    this[12] += this[ 0] * vec3[0] + this[ 4] * vec3[1] + this[ 8] * vec3[2];
    this[13] += this[ 1] * vec3[0] + this[ 5] * vec3[1] + this[ 9] * vec3[2];
    this[14] += this[ 2] * vec3[0] + this[ 6] * vec3[1] + this[10] * vec3[2];
    this[15] += this[ 3] * vec3[0] + this[ 7] * vec3[1] + this[11] * vec3[2];
    
    return this;
}

Tessellator.mat4.prototype.identity = function (){
    this[ 0] = 1;
    this[ 1] = 0;
    this[ 2] = 0;
    this[ 3] = 0;
    
    this[ 4] = 0;
    this[ 5] = 1;
    this[ 6] = 0;
    this[ 7] = 0;
    
    this[ 8] = 0;
    this[ 9] = 0;
    this[10] = 1;
    this[11] = 0;
    
    this[12] = 0;
    this[13] = 0;
    this[14] = 0;
    this[15] = 1;
    
    return this;
}

Tessellator.mat4.prototype.scale = function (vec3){
    if (vec3.tween){
        vec3.tween.update();
    }
    
    this[ 0] *= vec3[0];
    this[ 1] *= vec3[0];
    this[ 2] *= vec3[0];
    this[ 3] *= vec3[0];
    
    this[ 4] *= vec3[1];
    this[ 5] *= vec3[1];
    this[ 6] *= vec3[1];
    this[ 7] *= vec3[1];
    
    this[ 8] *= vec3[2];
    this[ 9] *= vec3[2];
    this[10] *= vec3[2];
    this[11] *= vec3[2];
    
    return this;
}

Tessellator.mat4.prototype.rotate = function (rot, vec3){
    if (rot.tween){
        rot.tween.update();
    }
    
    if (vec3.tween){
        vec3.tween.update();
    }
    
    //normalize
    var
        x = vec3[0],
        y = vec3[1],
        z = vec3[2],
        
        l = Math.sqrt(x * x + y * y + z * z);
    x /= l;
    y /= l;
    z /= l;
    
    var
        s = Math.sin(rot[0]),
        c = Math.cos(rot[0]),
        t = 1 - c,
        
        a00 = this[ 0],
        a01 = this[ 1],
        a02 = this[ 2],
        a03 = this[ 3],
        
        a10 = this[ 4],
        a11 = this[ 5],
        a12 = this[ 6],
        a13 = this[ 7],
        
        a20 = this[ 8],
        a21 = this[ 9],
        a22 = this[10],
        a23 = this[11],
        
        b00 = x * x * t + c,
        b01 = y * x * t + z * s,
        b02 = z * x * t - y * s,
        
        b10 = x * y * t - z * s,
        b11 = y * y * t + c,
        b12 = z * y * t + x * s,
        
        b20 = x * z * t + y * s,
        b21 = y * z * t - x * s,
        b22 = z * z * t + c;
    
    this[ 0] = a00 * b00 + a10 * b01 + a20 * b02;
    this[ 1] = a01 * b00 + a11 * b01 + a21 * b02;
    this[ 2] = a02 * b00 + a12 * b01 + a22 * b02;
    this[ 3] = a03 * b00 + a13 * b01 + a23 * b02;
    this[ 4] = a00 * b10 + a10 * b11 + a20 * b12;
    this[ 5] = a01 * b10 + a11 * b11 + a21 * b12;
    this[ 6] = a02 * b10 + a12 * b11 + a22 * b12;
    this[ 7] = a03 * b10 + a13 * b11 + a23 * b12;
    this[ 8] = a00 * b20 + a10 * b21 + a20 * b22;
    this[ 9] = a01 * b20 + a11 * b21 + a21 * b22;
    this[10] = a02 * b20 + a12 * b21 + a22 * b22;
    this[11] = a03 * b20 + a13 * b21 + a23 * b22;
    
    return this;
}

Tessellator.mat4.prototype.rotateX = function (rad) {
    if (rad.tween){
        rad.tween.update();
    }
    
    var s = Math.sin(rad[0]),
        c = Math.cos(rad[0]);
    
    var
        x10 = this[4],
        x11 = this[5],
        x12 = this[6],
        x13 = this[7];
    
    this[ 4] = this[ 4] * c + this[ 8] * s;
    this[ 5] = this[ 5] * c + this[ 9] * s;
    this[ 6] = this[ 6] * c + this[10] * s;
    this[ 7] = this[ 7] * c + this[11] * s;
    this[ 8] = this[ 8] * c - x10 * s;
    this[ 9] = this[ 9] * c - x11 * s;
    this[10] = this[10] * c - x12 * s;
    this[11] = this[11] * c - x13 * s;
    
    return this;
}

Tessellator.mat4.prototype.rotateY = function (rad) {
    if (rad.tween){
        rad.tween.update();
    }
    
    var s = Math.sin(rad[0]),
        c = Math.cos(rad[0]);
    
    //cache values
    var
        x00 = this[0],
        x01 = this[1],
        x02 = this[2],
        x03 = this[3];
    
    this[ 0] = x00 * c - this[ 8] * s;
    this[ 1] = x01 * c - this[ 9] * s;
    this[ 2] = x02 * c - this[10] * s;
    this[ 3] = x03 * c - this[11] * s;
    this[ 8] = x00 * s + this[ 8] * c;
    this[ 9] = x01 * s + this[ 9] * c;
    this[10] = x02 * s + this[10] * c;
    this[11] = x03 * s + this[11] * c;
    
    return this;
}

Tessellator.mat4.prototype.rotateZ = function (rad) {
    if (rad.tween){
        rad.tween.update();
    }
    
    var s = Math.sin(rad[0]),
        c = Math.cos(rad[0]);
    
    //cache values
    var
        x00 = this[0],
        x01 = this[1],
        x02 = this[2],
        x03 = this[3];
    
    this[0] = this[0] * c + this[4] * s;
    this[1] = this[1] * c + this[5] * s;
    this[2] = this[2] * c + this[6] * s;
    this[3] = this[3] * c + this[7] * s;
    this[4] = this[4] * c - x00 * s;
    this[5] = this[5] * c - x01 * s;
    this[6] = this[6] * c - x02 * s;
    this[7] = this[7] * c - x03 * s;
    
    return this;
}

Tessellator.mat4.prototype.rotateVec = function (vec, up){
    if (vec.tween) vec.tween.update();
    if (up.tween) up.tween.update();
    
    var z = vec.clone().normalize();
    var x = up.clone().cross(z).normalize();
    var y = z.clone().cross(x).normalize();
    
    var
        x00 = this[ 0],
        x01 = this[ 1],
        x02 = this[ 2],
        x10 = this[ 4],
        x11 = this[ 5],
        x12 = this[ 6],
        x20 = this[ 8],
        x21 = this[ 9],
        x22 = this[10];
    
    this[ 0] = x[0] * x00 + y[0] * x10 + z[0] * x20;
    this[ 1] = x[0] * x01 + y[0] * x11 + z[0] * x21;
    this[ 2] = x[0] * x02 + y[0] * x12 + z[0] * x22;
    
    this[ 4] = x[1] * x00 + y[1] * x10 + z[1] * x20;
    this[ 5] = x[1] * x01 + y[1] * x11 + z[1] * x21;
    this[ 6] = x[1] * x02 + y[1] * x12 + z[1] * x22;
    
    this[ 8] = x[2] * x00 + y[2] * x10 + z[2] * x20;
    this[ 9] = x[2] * x01 + y[2] * x11 + z[2] * x21;
    this[10] = x[2] * x02 + y[2] * x12 + z[2] * x22;
    
    return this;
}

Tessellator.mat4.prototype.align = function (v1, v2){
    if (v1.tween) v1.tween.update();
    if (v2.tween) v2.tween.update();
    
    v1 = v1.clone().normalize();
    v2 = v2.clone().normalize();
    
    var v = v1.clone().cross(v2);
    var c = v1.clone().dot(v2);
    
    if (v[0] === 0 && v[1] === 0 && v[2] === 0){
        v = Tessellator.vec3(1, 0, 0);
    }
    
    this.rotate(Math.acos(c[0]), v);
    return this;
}

Tessellator.mat4.prototype.toString = function (){
    var str = ["mat4("];
    
    for (var i = 0; i < 15; i++){
        str.push(this[i], ", ");
    }
    
    str.push(this[15], ")");
    
    return str.join("");
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.mat3 = function (){
    var array = new Float32Array(9);
    var pos = 0;
    
    for (var i = 0, k = arguments.length; i < k; i++){
        var arg = arguments[i];
        
        if (isNaN(arg)){
            array.set(arg, pos);
            pos += arg.length;
        }else{
            array[pos++] = arg;
        }
    }
    
    if (pos === 0){
        array[0] = 1;
        array[4] = 1;
        array[8] = 1;
    }else if (pos === 1){
        array[4] = array[0];
        array[8] = array[0];
    }else{
        if (pos < array.length){
            throw "too little information";
        }else if (pos > array.length){
            throw "too much information";
        }
    }
    
    array.__proto__ = Tessellator.mat3.prototype;
    return array;
}

Tessellator.mat3.prototype = Object.create(Float32Array.prototype);
Tessellator.mat3.prototype.constructor = Tessellator.mat3;

Tessellator.mat3.prototype.clone = function (){
    return Tessellator.mat3(this);
}

Tessellator.mat3.prototype.copy = function (copy){
    if (copy.constructor === Tessellator.mat3){
        this.set(copy);
    }else if (copy.length === 16){
        this[0] = copy[ 0];
        this[1] = copy[ 1];
        this[2] = copy[ 2];
        
        this[3] = copy[ 4];
        this[4] = copy[ 5];
        this[5] = copy[ 6];
        
        this[6] = copy[ 8];
        this[7] = copy[ 9];
        this[8] = copy[10];
    }else if (copy.length === 4){
        this[0] = copy[0];
        this[1] = copy[1];
        this[2] = 0;
        
        this[3] = copy[2];
        this[4] = copy[3];
        this[5] = 0;
        
        this[6] = 0;
        this[7] = 0;
        this[8] = 1;
    }else{
        throw "invalid arguments";
    }
    
    return this;
}

Tessellator.mat3.prototype.identity = function (){
    this[0] = 1;
    this[1] = 0;
    this[2] = 0;
    
    this[3] = 0;
    this[4] = 1;
    this[5] = 0;
    
    this[6] = 0;
    this[7] = 0;
    this[8] = 1;
    
    return this;
}

Tessellator.mat3.prototype.adjoint = function (joint) {
    var
        a00 = joint[0],
        a01 = joint[1],
        a02 = joint[2],
        a10 = joint[3],
        a11 = joint[4],
        a12 = joint[5],
        a20 = joint[6],
        a21 = joint[7],
        a22 = joint[8];


    this[0] = (a11 * a22 - a12 * a21);
    this[1] = (a02 * a21 - a01 * a22);
    this[2] = (a01 * a12 - a02 * a11);
    this[3] = (a12 * a20 - a10 * a22);
    this[4] = (a00 * a22 - a02 * a20);
    this[5] = (a02 * a10 - a00 * a12);
    this[6] = (a10 * a21 - a11 * a20);
    this[7] = (a01 * a20 - a00 * a21);
    this[8] = (a00 * a11 - a01 * a10);
    
    return this;
}

Tessellator.mat3.prototype.transpose = function (){
    var
        m01 = this[1],
        m02 = this[2],
        
        m10 = this[3],
        m12 = this[5],
        
        m20 = this[6],
        m21 = this[7];
    
    this[1] = m10;
    this[2] = m20;
    
    this[3] = m01;
    this[5] = m21;
    
    this[6] = m02;
    this[7] = m12;
}

Tessellator.mat3.prototype.invert = function (){
    var
        a00 = this[0],
        a01 = this[1],
        a02 = this[2],
        
        a10 = this[3],
        a11 = this[4],
        a12 = this[5],
        
        a20 = this[6],
        a21 = this[7],
        a22 = this[8];
    
    var
        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20;


    var det = a00 * b01 + a01 * b11 + a02 * b21;


    this[0] = b01                      / det;
    this[1] = (-a22 * a01 + a02 * a21) / det;
    this[2] = (a12 * a01 - a02 * a11)  / det;
    this[3] = b11                      / det;
    this[4] = (a22 * a00 - a02 * a20)  / det;
    this[5] = (-a12 * a00 + a02 * a10) / det;
    this[6] = b21                      / det;
    this[7] = (-a21 * a00 + a01 * a20) / det;
    this[8] = (a11 * a00 - a01 * a10)  / det;
}

Tessellator.mat3.prototype.normalFromMat4 = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],


        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,


        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;


    this[0] = (a11 * b11 - a12 * b10 + a13 * b09) / det;
    this[1] = (a12 * b08 - a10 * b11 - a13 * b07) / det;
    this[2] = (a10 * b10 - a11 * b08 + a13 * b06) / det;


    this[3] = (a02 * b10 - a01 * b11 - a03 * b09) / det;
    this[4] = (a00 * b11 - a02 * b08 + a03 * b07) / det;
    this[5] = (a01 * b08 - a00 * b10 - a03 * b06) / det;


    this[6] = (a31 * b05 - a32 * b04 + a33 * b03) / det;
    this[7] = (a32 * b02 - a30 * b05 - a33 * b01) / det;
    this[8] = (a30 * b04 - a31 * b02 + a33 * b00) / det;


    return this;
}

Tessellator.mat3.prototype.multiply = function (mat){
    var a00 = this[0], a01 = this[1], a02 = this[2],
        a10 = this[3], a11 = this[4], a12 = this[5],
        a20 = this[6], a21 = this[7], a22 = this[8],

        b00 = mat[0], b01 = mat[1], b02 = mat[2],
        b10 = mat[3], b11 = mat[4], b12 = mat[5],
        b20 = mat[6], b21 = mat[7], b22 = mat[8];

    this[0] = b00 * a00 + b01 * a10 + b02 * a20;
    this[1] = b00 * a01 + b01 * a11 + b02 * a21;
    this[2] = b00 * a02 + b01 * a12 + b02 * a22;

    this[3] = b10 * a00 + b11 * a10 + b12 * a20;
    this[4] = b10 * a01 + b11 * a11 + b12 * a21;
    this[5] = b10 * a02 + b11 * a12 + b12 * a22;

    this[6] = b20 * a00 + b21 * a10 + b22 * a20;
    this[7] = b20 * a01 + b21 * a11 + b22 * a21;
    this[8] = b20 * a02 + b21 * a12 + b22 * a22;
    
    return this;
}

Tessellator.mat3.prototype.translate = function (vec){
    if (vec.tween){
        vec.tween.update();
    }
    
    this[6] += vec[0] * this[0] + vec[1] * this[3];
    this[7] += vec[0] * this[1] + vec[1] * this[4];
    this[8] += vec[0] * this[2] + vec[1] * this[5];
    
    return this;
}

Tessellator.mat3.prototype.scale = function (vec){
    if (vec.tween){
        vec.tween.update();
    }
    
    this[0] *= vec[0];
    this[1] *= vec[0];
    this[2] *= vec[0];
    
    this[3] *= vec[1];
    this[4] *= vec[1];
    this[5] *= vec[1];
    
    return this;
}

Tessellator.mat3.prototype.rotate = function (){
    if (arguments.length === 1){
        var rad = arguments[0];
        
        if (rad.length){
            rad = Tessellator.float.forValue(rad);
        }
        
        var
            s = Math.sin(rad),
            c = Math.cos(rad),
            
            a00 = this[0], a01 = this[1], a02 = this[2],
            a10 = this[3], a11 = this[4], a12 = this[5];
        
        this[0] = c * a00 + s * a10;
        this[1] = c * a01 + s * a11;
        this[2] = c * a02 + s * a12;

        this[3] = c * a10 - s * a00;
        this[4] = c * a11 - s * a01;
        this[5] = c * a12 - s * a02;
    }else{
        var
            rot = arguments[0],
            vec3 = arguments[1];
        
        if (rot.length){
            rot = Tessellator.float.forValue(rot);
        }
        
        if (vec3.tween){
            vec3.tween.update();
        }
        
        //normalize
        var
            x = vec3[0],
            y = vec3[1],
            z = vec3[2],
            
            l = Math.sqrt(x * x + y * y + z * z);
        x /= l;
        y /= l;
        z /= l;
        
        var
            s = Math.sin(rot),
            c = Math.cos(rot),
            t = 1 - c,
            
            a00 = this[0],
            a01 = this[1],
            a02 = this[2],
            
            a10 = this[3],
            a11 = this[4],
            a12 = this[5],
            
            a20 = this[6],
            a21 = this[7],
            a22 = this[8],
            
            b00 = x * x * t + c,
            b01 = y * x * t + z * s,
            b02 = z * x * t - y * s,
            
            b10 = x * y * t - z * s,
            b11 = y * y * t + c,
            b12 = z * y * t + x * s,
            
            b20 = x * z * t + y * s,
            b21 = y * z * t - x * s,
            b22 = z * z * t + c;
        
        this[0] = a00 * b00 + a10 * b01 + a20 * b02;
        this[1] = a01 * b00 + a11 * b01 + a21 * b02;
        this[2] = a02 * b00 + a12 * b01 + a22 * b02;
        
        this[3] = a00 * b10 + a10 * b11 + a20 * b12;
        this[4] = a01 * b10 + a11 * b11 + a21 * b12;
        this[5] = a02 * b10 + a12 * b11 + a22 * b12;
        
        this[6] = a00 * b20 + a10 * b21 + a20 * b22;
        this[7] = a01 * b20 + a11 * b21 + a21 * b22;
        this[8] = a02 * b20 + a12 * b21 + a22 * b22;
    }
    
    return this;
}

Tessellator.mat3.prototype.rotateVec = function (vec, up){
    if (vec.tween) vec.tween.update();
    if (up.tween) up.tween.update();
    
    var z = vec.clone().normalize();
    var x = up.clone().cross(z).normalize();
    var y = z.clone().cross(x).normalize();
    
    var
        x00 = this[0],
        x01 = this[1],
        x02 = this[2],
        x10 = this[3],
        x11 = this[4],
        x12 = this[5],
        x20 = this[6],
        x21 = this[7],
        x22 = this[8];
    
    this[0] = x[0] * x00 + y[0] * x10 + z[0] * x20;
    this[1] = x[0] * x01 + y[0] * x11 + z[0] * x21;
    this[2] = x[0] * x02 + y[0] * x12 + z[0] * x22;
    
    this[3] = x[1] * x00 + y[1] * x10 + z[1] * x20;
    this[4] = x[1] * x01 + y[1] * x11 + z[1] * x21;
    this[5] = x[1] * x02 + y[1] * x12 + z[1] * x22;
    
    this[6] = x[2] * x00 + y[2] * x10 + z[2] * x20;
    this[7] = x[2] * x01 + y[2] * x11 + z[2] * x21;
    this[8] = x[2] * x02 + y[2] * x12 + z[2] * x22;
    
    return this;
}

Tessellator.mat3.prototype.align = function (v1, v2){
    if (v1.tween) v1.tween.update();
    if (v2.tween) v2.tween.update();
    
    v1 = v1.clone().normalize();
    v2 = v2.clone().normalize();
    
    var v = v1.clone().cross(v2);
    var c = v1.clone().dot(v2);
    
    if (v[0] === 0 && v[1] === 0 && v[2] === 0){
        v = Tessellator.vec3(1, 0, 0);
    }
    
    this.rotate(Math.acos(c[0]), v);
    return this;
}

Tessellator.mat3.prototype.toString = function (){
    var str = ["mat3("];
    
    for (var i = 0; i < 8; i++){
        str.push(this[i], ", ");
    }
    
    str.push(this[8], ")");
    
    return str.join("");
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.mat2 = function (){
    var array = new Float32Array(4);
    var pos = 0;
    
    for (var i = 0, k = arguments.length; i < k; i++){
        var arg = arguments[i];
        
        if (isNaN(arg)){
            array.set(arg, pos);
            pos += arg.length;
        }else{
            array[pos++] = arg;
        }
    }
    
    if (pos === 0){
        array[0] = 1;
        array[3] = 1;
    }else if (pos === 1){
        array[3] = array[0];
    }else{
        if (pos < array.length){
            throw "too little information";
        }else if (pos > array.length){
            throw "too much information";
        }
    }
    
    array.__proto__ = Tessellator.mat2.prototype;
    return array;
}

Tessellator.mat2.prototype = Object.create(Float32Array.prototype);
Tessellator.mat2.prototype.constructor = Tessellator.mat2;

Tessellator.mat2.prototype.identity = function (scale){
    if (scale === undefined){
        scale = 1;
    }else if (scale.tween){
        scale.tween.update();
    }
    
    this[0] = scale[0];
    this[1] = 0;
    
    this[2] = 0;
    this[3] = scale[0];
    
    return this;
}

Tessellator.mat2.prototype.invert = function (){
    var
        a0 = this[0],
        a1 = this[1],
        a2 = this[2],
        a3 = this[3],
        
        det = a0 * a3 - a2 * a1;
    
    this[0] =  a3 / det;
    this[1] = -a1 / det;
    this[2] = -a2 / det;
    this[2] =  a0 / det;
    
    return this;
}

Tessellator.mat2.prototype.determinant = function (){
    return this[0] * this[3] - this[2] * this[1];
}

Tessellator.mat2.prototype.adjoint = function (){
    var a0 = this[0];
    this[0] =  this[3];
    this[1] = -this[1];
    this[2] = -this[2];
    this[3] = a0;
    
    return this;
}

Tessellator.mat2.prototype.multiply = function (mat){
    var
        a0 = this[0],
        a1 = this[1],
        a2 = this[2],
        a3 = this[3],
        
        b0 = mat[0],
        b1 = mat[1],
        b2 = mat[2],
        b3 = mat[3];
    
    this[0] = a0 * b0 + a2 * b1;
    this[1] = a1 * b0 + a3 * b1;
    this[2] = a0 * b2 + a2 * b3;
    this[3] = a1 * b2 + a3 * b3;

    return this;
}

Tessellator.mat2.prototype.rotate = function (rad){
    if (rad.length){
        if (rad.tween) rad.tween.update();
        
        rad = Tessellator.float.forValue(rad);
    }
    
    var
        a0 = this[0],
        a1 = this[1],
        a2 = this[2],
        a3 = this[3],
        
        s = Math.sin(rad),
        c = Math.cos(rad);
    
    this[0] = a0 *  c + a2 * s;
    this[1] = a1 *  c + a3 * s;
    this[2] = a0 * -s + a2 * c;
    this[3] = a1 * -s + a3 * c;
    
    return this;
}

Tessellator.mat2.prototype.scale = function (s){
    if (s.tween){
        s.tween.update();
    }
    
    this[0] *= s[0];
    this[1] *= s[0];
    this[2] *= s[0];
    this[3] *= s[0];
    
    return this;
}

Tessellator.mat2.prototype.copy = function (mat){
    this.set(mat);
    
    return this;
}

Tessellator.mat2.prototype.clone = function (){
    return Tessellator.mat2(this);
}

Tessellator.mat2.prototype.transpose = function (){
    var
        x01 = this[1],
        x10 = this[2];
    
    this[1] = x10;
    this[2] = x01;
    
    return this;
}

Tessellator.mat2.prototype.toString = function (){
    return "mat2(" + this[0] + ", " + this[1] + ", " + this[2] + ", " + this[3] + ")";
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.vec4 = function (){
    var array = new Float32Array(4);
    var pos = 0;
    
    for (var i = 0, k = arguments.length; i < k; i++){
        var arg = arguments[i];
        
        if (isNaN(arg)){
            if (arg.tween) arg.tween.update();
            
            array.set(arg, pos);
            pos += arg.length;
        }else{
            array[pos++] = arg;
        }
    }
    
    if (pos === 1){
        array[1] = array[0];
        array[2] = array[0];
        array[3] = array[0];
    }else if (pos !== 0){
        if (pos < array.length){
            throw "too little information";
        }else if (pos > array.length){
            throw "too much information";
        }
    }
    
    array.__proto__ = Tessellator.vec4.prototype;
    
    return array;
}

Tessellator.vec4.prototype = Object.create(Float32Array.prototype);
Tessellator.vec4.prototype.constructor = Tessellator.vec4;

Tessellator.vec4.prototype.clear = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 0;
    this[1] = 0;
    this[3] = 0;
    this[2] = 0;
}

Tessellator.vec4.prototype.clone = function (){
    return Tessellator.vec4(this);
}

Tessellator.vec4.prototype.copy = function (vec4){
    if (vec4.tween) vec4.tween.update();
    
    this.set(vec4)
    
    return this;
}

Tessellator.vec4.prototype.exp = function(vec){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = Math.pow(this[0], vec[0]);
        this[1] = Math.pow(this[1], vec[1]);
        this[2] = Math.pow(this[2], vec[2]);
        this[3] = Math.pow(this[3], vec[3]);
    }else{
        this[0] = Math.pow(this[0], vec);
        this[1] = Math.pow(this[1], vec);
        this[2] = Math.pow(this[2], vec);
        this[3] = Math.pow(this[3], vec);
    }
    
    return this;
}

Tessellator.vec4.prototype.sqrt = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.sqrt(this[0]);
    this[1] = Math.sqrt(this[1]);
    this[2] = Math.sqrt(this[2]);
    this[3] = Math.sqrt(this[3]);
    
    return this;
}

Tessellator.vec4.prototype.inversesqrt = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 1 / Math.sqrt(this[0]);
    this[1] = 1 / Math.sqrt(this[1]);
    this[2] = 1 / Math.sqrt(this[2]);
    this[3] = 1 / Math.sqrt(this[3]);
    
    return this;
}

Tessellator.vec4.prototype.abs = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.abs(this[0]);
    this[1] = Math.abs(this[1]);
    this[2] = Math.abs(this[2]);
    this[3] = Math.abs(this[3]);
    
    return this;
}

Tessellator.vec4.prototype.sign = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = this[0] > 0 ? 1 : (this[0] < 0 ? -1 : this[0]);
    this[1] = this[1] > 0 ? 1 : (this[1] < 0 ? -1 : this[1]);
    this[2] = this[2] > 0 ? 1 : (this[2] < 0 ? -1 : this[2]);
    this[3] = this[3] > 0 ? 1 : (this[3] < 0 ? -1 : this[3]);
    
    return this;
}

Tessellator.vec4.prototype.step = function (edge){
    if (this.tween) this.tween.update();
    edge = Tessellator.float.forValue(edge);
    
    if (edge.length){
        this[0] = this[0] < edge[0] ? 0 : 1;
        this[1] = this[1] < edge[1] ? 0 : 1;
        this[2] = this[2] < edge[2] ? 0 : 1;
        this[3] = this[3] < edge[3] ? 0 : 1;
    }else{
        this[0] = this[0] < edge ? 0 : 1;
        this[1] = this[1] < edge ? 0 : 1;
        this[2] = this[2] < edge ? 0 : 1;
        this[3] = this[3] < edge ? 0 : 1;
    }
    
    return this;
}

Tessellator.vec4.prototype.floor = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.floor(this[0]);
    this[1] = Math.floor(this[1]);
    this[2] = Math.floor(this[2]);
    this[3] = Math.floor(this[3]);
    
    return this;
}

Tessellator.vec4.prototype.ceil = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = Math.ceil(this[0]);
    this[1] = Math.ceil(this[1]);
    this[2] = Math.ceil(this[2]);
    this[3] = Math.ceil(this[3]);
    
    return this;
}

Tessellator.vec4.prototype.mod = function (vec){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = this[0] % vec[0];
        this[1] = this[1] % vec[1];
        this[2] = this[2] % vec[2];
        this[3] = this[3] % vec[3];
    }else{
        this[0] = this[0] % vec;
        this[1] = this[1] % vec;
        this[2] = this[2] % vec;
        this[3] = this[3] % vec;
    }
    
    return this;
}

Tessellator.vec4.prototype.clamp = function (min, max){
    if (this.tween) this.tween.cancel();
    min = Tessellator.float.forValue(min);
    max = Tessellator.float.forValue(max);
    
    if (!min.length) min = Tessellator.vec4(min);
    if (!max.length) max = Tessellator.vec4(max);
    
    this[0] = this[0] < min[0] ? min[0] : (this[0] > max[0] ? max[0] : this[0]);
    this[1] = this[1] < min[1] ? min[1] : (this[1] > max[0] ? max[1] : this[1]);
    this[2] = this[2] < min[2] ? min[2] : (this[2] > max[0] ? max[2] : this[2]);
    this[3] = this[3] < min[3] ? min[3] : (this[3] > max[0] ? max[3] : this[3]);
    
    return this;
}

Tessellator.vec4.prototype.fract = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = this[0] - Math.floor(this[0]);
    this[1] = this[1] - Math.floor(this[1]);
    this[2] = this[2] - Math.floor(this[2]);
    this[3] = this[3] - Math.floor(this[3]);
    
    return this;
}

Tessellator.vec4.prototype.mix = function (vec, l){
    if (this.tween) this.tween.update();
    l = Tessellator.float.forValue(l);
    
    if (l.length){
        this[0] = this[0] + l[0] * (vec4[0] - this[0]);
        this[1] = this[1] + l[1] * (vec4[1] - this[1]);
        this[2] = this[2] + l[2] * (vec4[2] - this[2]);
        this[3] = this[3] + l[3] * (vec4[3] - this[3]);
    }else{
        this[0] = this[0] + l * (vec4[0] - this[0]);
        this[1] = this[1] + l * (vec4[1] - this[1]);
        this[2] = this[2] + l * (vec4[2] - this[2]);
        this[3] = this[3] + l * (vec4[3] - this[3]);
    }
    
    return this;
}

Tessellator.vec4.prototype.add = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] += vec[0];
            this[1] += vec[1];
            this[2] += vec[2];
            this[3] += vec[3];
        }else{
            this[0] += vec;
            this[1] += vec;
            this[2] += vec;
            this[3] += vec;
        }
    }else{
        this[0] += arguments[0];
        this[1] += arguments[1];
        this[2] += arguments[2];
        this[3] += arguments[3];
    }
    
    return this;
}

Tessellator.vec4.prototype.subtract = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] -= vec[0];
            this[1] -= vec[1];
            this[2] -= vec[2];
            this[3] -= vec[3];
        }else{
            this[0] -= vec;
            this[1] -= vec;
            this[2] -= vec;
            this[3] -= vec;
        }
    }else{
        this[0] -= arguments[0];
        this[1] -= arguments[1];
        this[2] -= arguments[2];
        this[3] -= arguments[3];
    }
    
    return this;
}

Tessellator.vec4.prototype.multiply = function (){
    if (this.tween) this.tween.cancel();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length === 16){
            var
                x = this[0],
                y = this[1],
                z = this[2],
                w = this[3];
            
            this[0] = vec[0] * x + vec[4] * y + vec[8 ] * z + vec[12] * w;
            this[1] = vec[1] * x + vec[5] * y + vec[9 ] * z + vec[13] * w;
            this[2] = vec[2] * x + vec[6] * y + vec[10] * z + vec[14] * w;
            this[3] = vec[3] * x + vec[7] * y + vec[11] * z + vec[15] * w;
        }else if (vec.length){
            this[0] *= vec[0];
            this[1] *= vec[1];
            this[2] *= vec[2];
            this[3] *= vec[3];
        }else{
            this[0] *= vec;
            this[1] *= vec;
            this[2] *= vec;
            this[3] *= vec;
        }
    }else{
        this[0] *= arguments[0];
        this[1] *= arguments[1];
        this[2] *= arguments[2];
        this[3] *= arguments[3];
    }
    
    return this;
}

Tessellator.vec4.prototype.divide = function (){
    if (this.tween) this.tween.update();
    
    if (arguments.length === 1){
        var vec = Tessellator.float.forValue(arguments[0]);
        
        if (vec.length){
            this[0] /= vec[0];
            this[1] /= vec[1];
            this[2] /= vec[2];
            this[3] /= vec[3];
        }else{
            this[0] /= vec;
            this[1] /= vec;
            this[2] /= vec;
            this[3] /= vec;
        }
    }else{
        this[0] /= arguments[0];
        this[1] /= arguments[1];
        this[2] /= arguments[2];
        this[3] /= arguments[3];
    }
    
    return this;
}

Tessellator.vec4.prototype.min = function (vec){
    if (this.tween) this.tween.cancel();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = Math.min(this[0], vec[0]);
        this[1] = Math.min(this[1], vec[1]);
        this[2] = Math.min(this[2], vec[2]);
        this[3] = Math.min(this[3], vec[3]);
    }else{
        this[0] = Math.min(this[0], vec);
        this[1] = Math.min(this[1], vec);
        this[2] = Math.min(this[2], vec);
        this[3] = Math.min(this[3], vec);
    }
    
    return this;
}

Tessellator.vec4.prototype.max = function (vec){
    if (this.tween) this.tween.update();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        this[0] = Math.max(this[0], vec[0]);
        this[1] = Math.max(this[1], vec[1]);
        this[2] = Math.max(this[2], vec[2]);
        this[3] = Math.max(this[3], vec[3]);
    }else{
        this[0] = Math.max(this[0], vec);
        this[1] = Math.max(this[1], vec);
        this[2] = Math.max(this[2], vec);
        this[3] = Math.max(this[3], vec);
    }
    
    return this;
}

Tessellator.vec4.prototype.squaredDistance = function (vec){
    if (this.tween) this.tween.update();
    vec = Tessellator.float.forValue(vec);
    
    var x, y, z, w;
    
    if (vec.length){
        x = vec[0] - this[0];
        y = vec[1] - this[1];
        z = vec[2] - this[2];
        w = vec[3] - this[3];
    }else{
        x = vec - this[0];
        y = vec - this[1];
        z = vec - this[2];
        w = vec - this[3];
    }
    
    return Tessellator.float(x * x + y * y + z * z + w * w);
}

Tessellator.vec4.prototype.distance = function (vec4){
    return this.squaredDistance(vec4).sqrt();
}

Tessellator.vec4.prototype.dot = function (vec){
    if (this.tween) this.tween.update();
    vec = Tessellator.float.forValue(vec);
    
    if (vec.length){
        return Tessellator.float(this[0] * vec[0] + this[1] * vec[1] + this[2] * vec[2] + this[3] * vec[3]);
    }else{
        return Tessellator.float(this[0] * vec + this[1] * vec + this[2] * vec + this[3] * vec);
    }
}

Tessellator.vec4.prototype.squaredLength = function (){
    return this.dot(this);
}

Tessellator.vec4.prototype.len = function (){
    return this.squaredLength().sqrt();
}

Tessellator.vec4.prototype.normalize = function (){
    if (this.tween) this.tween.cancel();
    
    var d = this.len();
    this[0] /= d[0];
    this[1] /= d[0];
    this[2] /= d[0];
    this[3] /= d[0];
    
    return this;
}

Tessellator.vec4.prototype.invert = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    this[2] = 1 / this[2];
    this[3] = 1 / this[3];
    
    return this;
}

Tessellator.vec4.prototype.negate = function (){
    if (this.tween) this.tween.cancel();
    
    this[0] = -this[0];
    this[1] = -this[1];
    this[2] = -this[2];
    this[3] = -this[3];
    
    return this;
}

Tessellator.vec4.prototype.random = function (scale){
    if (this.tween) this.tween.cancel();
    
    if (scale === undefined){
        scale = 1;
    }else{
        scale = Tessellator.float.forValue(scale);
    }
    
    if (scale.length){
        this[0] = Math.random() * scale[0];
        this[1] = Math.random() * scale[1];
        this[2] = Math.random() * scale[2];
        this[3] = Math.random() * scale[3];

    }else{
        this[0] = Math.random() * scale;
        this[1] = Math.random() * scale;
        this[2] = Math.random() * scale;
        this[3] = Math.random() * scale;
    }
    
    return this;
}

Tessellator.vec4.prototype.x = function (){
    if (this.tween) this.tween.update();
    
    return this[0];
}

Tessellator.vec4.prototype.y = function (){
    if (this.tween) this.tween.update();
    
    return this[1];
}

Tessellator.vec4.prototype.z = function (){
    if (this.tween) this.tween.update();
    
    return this[2];
}

Tessellator.vec4.prototype.w = function (){
    if (this.tween) this.tween.update();
    
    return this[3];
}

Tessellator.vec4.prototype.createTween = function (){
    return this.tween = new Tessellator.Tween(this);
}

Tessellator.vec4.prototype.toString = function (){
    return "vec4(" + this[0] + ", " + this[1] + ", " + this[2] + ", " + this[3] + ")";
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Array = function (){
    if (arguments.length === 2){
        this.buffer = new Float64Array(arguments[0]);
        this.incrementSize = arguments[1];
        this.length = arguments[0].length;
    }else if (arguments.length === 1){
        if (isNaN(arguments[0])){
            this.buffer = new Float64Array(arguments[0]);
            this.incrementSize = 256;
            this.length = arguments[0].length;
        }else{
            this.incrementSize = arguments[0];
            this.buffer = new Float64Array(this.incrementSize);
            this.length = 0;
        }
    }else{
        this.incrementSize = 256;
        this.buffer = new Float64Array(this.incrementSize);
        this.length = 0;
    }
}

Tessellator.Array.clear = function (){
    this.buffer = new Float64Array(this.incrementSize);
    this.length = 0;
}

Tessellator.Array.prototype.instance = function (value, copies){
    var a = new Float32Array(copies);
    
    for (var i = 0; i < a.length; a++){
        a[i] = value;
    }
    
    this.push(a);
}

Tessellator.Array.prototype.push = function (){
    var size = 0;
    
    for (var i = 0, k = arguments.length; i < k; i++){
        var arg = arguments[i];
        
        if (arg.length){
            size += arg.length;
        }else{
            size++;
        }  
    }
    
    if (size > 0){
        if (this.buffer.length < this.length + size){
            var newArray = new Float64Array(this.length + size + this.incrementSize);
            newArray.set(this.buffer, 0);
            this.buffer = newArray;
        }
        
        var pos = this.length;
        this.length += size;
        
        for (var i = 0, k = arguments.length; i < k; i++){
            var arg = arguments[i];
            
            if (arg.length){
                if (arg.constructor === Tessellator.Array || arg.constructor === Tessellator.FragmentedArray){
                    arg.write(this.buffer, pos);
                }else{
                    this.buffer.set(arg, pos);
                }
                
                pos += arg.length;
            }else{
                this.buffer[pos++] = arg;
            }
        }
    }
}

Tessellator.Array.prototype.offset = function (off){
    for (var i = 0; i < this.length; i++){
        this.buffer[i] += off;
    }
}

Tessellator.Array.prototype.get = function (index){
    return this.buffer[index];
}

Tessellator.Array.prototype.set = function (index, value){
    this.buffer[index] = value;
}

Tessellator.Array.prototype.write = function (array, pos){
    array.set(this.buffer.subarray(0, this.length), pos);
}

Tessellator.Array.prototype.compress = function (){}

Tessellator.Array.prototype.combine = function (func){
    if (this.buffer.constructor === func){
        return this.buffer.subarray(0, this.length);
    }
    
    return new (func || Float32Array)(this.buffer.subarray(0, this.length));
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.FragmentedArray = function (size){
    this.length = 0;
    
    if (isNaN(size) && arguments.length){
        this.incrementSize = 8;
        
        this.elements = arguments.length;
        this.buffer = new Array(this.elements);
        
        for (var i = 0; i < this.elements; i++){
            this.buffer = arguments[i];
            this.length += arguments[i];
        }
    }else{
        this.incrementSize = size || 8;
        this.buffer = null;
        this.elements = 0;
    }
}

Tessellator.FragmentedArray.prototype.clear = function (){
    this.length = 0;
    this.buffer = null;
    this.elements = 0;
}

Tessellator.FragmentedArray.prototype.instance = function (value, copies){
    var a = new Float32Array(copies);
    
    for (var i = 0; i < a.length; a++){
        a[i] = value;
    }
    
    this.push(a);
}

Tessellator.FragmentedArray.prototype.removeElement = function (index){
    this.length -= this.buffer[index].length;
    for (var i = index; i < this.elements; i++){
        this.buffer[i] = this.buffer[i + 1];
    }
    
    this.elements--;
}

Tessellator.FragmentedArray.prototype.push = function (arg){
    if (!this.buffer){
        this.buffer = new Array(this.incrementSize);
    }else if (this.buffer.length === this.elements){
        this.buffer.length += this.incrementSize;
    }
    
    this.buffer[this.elements] = arg;
    
    this.length += arg.length;
    this.elements++;
}

Tessellator.FragmentedArray.prototype.offset = function (off){
    for (var i = 0; i < this.elements; i++){
        var e = this.buffer[i];
        
        for (var ii = 0; ii < e.length; ii++){
            e[ii] += off;
        }
    }
}

Tessellator.FragmentedArray.prototype.get = function (index){
    if (index < 0 || index > this.length){
        throw "index is out of range to access fragmented array";
    }
    
    var i, pos = this.length;
    
    for (i = this.elements - 1; pos > index; i--){
        pos -= this.buffer[i].length;
    }
    
    var e = this.buffer[i + 1];
    
    if (e.constructor === Tessellator.FragmentedArray || e.constructor === Tessellator.Array){
        return e.get(index - pos);
    }else{
        return e[index - pos];
    }
}

Tessellator.FragmentedArray.prototype.set = function (index, value){
    var i, pos = this.length;
    
    for (i = this.elements - 1; pos > index; i--){
        pos -= this.buffer[i].length;
    }
    
    var e = this.buffer[i + 1];
    
    if (e.constructor === Tessellator.FragmentedArray){
        return e.set(index - pos, value);
    }else{
        return e[index - pos] = value;
    }
}

Tessellator.FragmentedArray.prototype.write = function (array, pos){
    for (var i = 0; i < this.elements; i++){
        var e = this.buffer[i];
        
        if (e.constructor === Tessellator.FragmentedArray || e.constructor === Tessellator.Array){
            e.write(array, pos);
        }else{
            array.set(e, pos);
        }
        
        pos += e.length;
    }
}

Tessellator.FragmentedArray.prototype.compress = function (){
    this.buffer = [ this.combine() ];
    this.elements = 1;
}

Tessellator.FragmentedArray.prototype.combine = function (func){
    var arr = new (func || Float32Array)(this.length);
    
    this.write(arr, 0);
    
    return arr;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Constant = function (name, value){
    this.name = name;
    this.gl = value;
    
    Tessellator.Constant.VALUES[name] = this;
    Tessellator.Constant.VALUE_NAME[value] = name;
    Tessellator.Constant.NAME_VALUE[name] = value;
}

Tessellator.Constant.prototype.toString = function () {
    return this.name;
}

Tessellator.Constant.prototype.getValue = function () {
    return this.value;
}

Tessellator.Constant.VALUES = {};
Tessellator.Constant.NAME_VALUE = {};
Tessellator.Constant.VALUE_NAME = {};

Tessellator.Constant.create = function (name, value){
    var gl = Tessellator.Constant.VALUES[name];
    
    if (gl){
        gl.value = value;
        
        return gl;
    }else{
        var c = new Tessellator.Constant(name);
        c.value = value;
        
        return c;
    }
}

{ //webgl 1.0
    Tessellator.DEPTH_BUFFER_BIT = new Tessellator.Constant("DEPTH_BUFFER_BIT",  0x00000100);
    Tessellator.STENCIL_BUFFER_BIT = new Tessellator.Constant("STENCIL_BUFFER_BIT",  0x00000400);
    Tessellator.COLOR_BUFFER_BIT = new Tessellator.Constant("COLOR_BUFFER_BIT",  0x00004000);

    Tessellator.POINTS = new Tessellator.Constant("POINTS",  0x0000);
    Tessellator.LINES = new Tessellator.Constant("LINES",  0x0001);
    Tessellator.LINE_LOOP = new Tessellator.Constant("LINE_LOOP",  0x0002);
    Tessellator.LINE_STRIP = new Tessellator.Constant("LINE_STRIP",  0x0003);
    Tessellator.TRIANGLES = new Tessellator.Constant("TRIANGLES",  0x0004);
    Tessellator.TRIANGLE_STRIP = new Tessellator.Constant("TRIANGLE_STRIP",  0x0005);
    Tessellator.TRIANGLE_FAN = new Tessellator.Constant("TRIANGLE_FAN",  0x0006);

    Tessellator.ZERO = new Tessellator.Constant("ZERO",  0);
    Tessellator.ONE = new Tessellator.Constant("ONE",  1);
    Tessellator.SRC_COLOR = new Tessellator.Constant("SRC_COLOR",  0x0300);
    Tessellator.ONE_MINUS_SRC_COLOR = new Tessellator.Constant("ONE_MINUS_SRC_COLOR",  0x0301);
    Tessellator.SRC_ALPHA = new Tessellator.Constant("SRC_ALPHA",  0x0302);
    Tessellator.ONE_MINUS_SRC_ALPHA = new Tessellator.Constant("ONE_MINUS_SRC_ALPHA",  0x0303);
    Tessellator.DST_ALPHA = new Tessellator.Constant("DST_ALPHA",  0x0304);
    Tessellator.ONE_MINUS_DST_ALPHA = new Tessellator.Constant("ONE_MINUS_DST_ALPHA",  0x0305);

    Tessellator.DST_COLOR = new Tessellator.Constant("DST_COLOR",  0x0306);
    Tessellator.ONE_MINUS_DST_COLOR = new Tessellator.Constant("ONE_MINUS_DST_COLOR",  0x0307);
    Tessellator.SRC_ALPHA_SATURATE = new Tessellator.Constant("SRC_ALPHA_SATURATE",  0x0308);

    Tessellator.FUNC_ADD = new Tessellator.Constant("FUNC_ADD",  0x8006);
    Tessellator.BLEND_EQUATION = new Tessellator.Constant("BLEND_EQUATION",  0x8009);
    Tessellator.BLEND_EQUATION_RGB = new Tessellator.Constant("BLEND_EQUATION_RGB",  0x8009);
    Tessellator.BLEND_EQUATION_ALPHA = new Tessellator.Constant("BLEND_EQUATION_ALPHA",  0x883D);

    Tessellator.FUNC_SUBTRACT = new Tessellator.Constant("FUNC_SUBTRACT",  0x800A);
    Tessellator.FUNC_REVERSE_SUBTRACT = new Tessellator.Constant("FUNC_REVERSE_SUBTRACT",  0x800B);

    Tessellator.BLEND_DST_RGB = new Tessellator.Constant("BLEND_DST_RGB",  0x80C8);
    Tessellator.BLEND_SRC_RGB = new Tessellator.Constant("BLEND_SRC_RGB",  0x80C9);
    Tessellator.BLEND_DST_ALPHA = new Tessellator.Constant("BLEND_DST_ALPHA",  0x80CA);
    Tessellator.BLEND_SRC_ALPHA = new Tessellator.Constant("BLEND_SRC_ALPHA",  0x80CB);
    Tessellator.CONSTANT_COLOR = new Tessellator.Constant("CONSTANT_COLOR",  0x8001);
    Tessellator.ONE_MINUS_CONSTANT_COLOR = new Tessellator.Constant("ONE_MINUS_CONSTANT_COLOR",  0x8002);
    Tessellator.CONSTANT_ALPHA = new Tessellator.Constant("CONSTANT_ALPHA",  0x8003);
    Tessellator.ONE_MINUS_CONSTANT_ALPHA = new Tessellator.Constant("ONE_MINUS_CONSTANT_ALPHA",  0x8004);
    Tessellator.BLEND_COLOR = new Tessellator.Constant("BLEND_COLOR",  0x8005);

    Tessellator.ARRAY_BUFFER = new Tessellator.Constant("ARRAY_BUFFER",  0x8892);
    Tessellator.ELEMENT_ARRAY_BUFFER = new Tessellator.Constant("ELEMENT_ARRAY_BUFFER",  0x8893);
    Tessellator.ARRAY_BUFFER_BINDING = new Tessellator.Constant("ARRAY_BUFFER_BINDING",  0x8894);
    Tessellator.ELEMENT_ARRAY_BUFFER_BINDING = new Tessellator.Constant("ELEMENT_ARRAY_BUFFER_BINDING",  0x8895);

    Tessellator.STREAM_DRAW = new Tessellator.Constant("STREAM_DRAW",  0x88E0);
    Tessellator.STATIC_DRAW = new Tessellator.Constant("STATIC_DRAW",  0x88E4);
    Tessellator.DYNAMIC_DRAW = new Tessellator.Constant("DYNAMIC_DRAW",  0x88E8);

    Tessellator.BUFFER_SIZE = new Tessellator.Constant("BUFFER_SIZE",  0x8764);
    Tessellator.BUFFER_USAGE = new Tessellator.Constant("BUFFER_USAGE",  0x8765);

    Tessellator.CURRENT_VERTEX_ATTRIB = new Tessellator.Constant("CURRENT_VERTEX_ATTRIB",  0x8626);

    Tessellator.FRONT = new Tessellator.Constant("FRONT",  0x0404);
    Tessellator.BACK = new Tessellator.Constant("BACK",  0x0405);
    Tessellator.FRONT_AND_BACK = new Tessellator.Constant("FRONT_AND_BACK",  0x0408);

    Tessellator.CULL_FACE = new Tessellator.Constant("CULL_FACE",  0x0B44);
    Tessellator.BLEND = new Tessellator.Constant("BLEND",  0x0BE2);
    Tessellator.DITHER = new Tessellator.Constant("DITHER",  0x0BD0);
    Tessellator.STENCIL_TEST = new Tessellator.Constant("STENCIL_TEST",  0x0B90);
    Tessellator.DEPTH_TEST = new Tessellator.Constant("DEPTH_TEST",  0x0B71);
    Tessellator.SCISSOR_TEST = new Tessellator.Constant("SCISSOR_TEST",  0x0C11);
    Tessellator.POLYGON_OFFSET_FILL = new Tessellator.Constant("POLYGON_OFFSET_FILL",  0x8037);
    Tessellator.SAMPLE_ALPHA_TO_COVERAGE = new Tessellator.Constant("SAMPLE_ALPHA_TO_COVERAGE",  0x809E);
    Tessellator.SAMPLE_COVERAGE = new Tessellator.Constant("SAMPLE_COVERAGE",  0x80A0);

    Tessellator.NO_ERROR = new Tessellator.Constant("NO_ERROR",  0);
    Tessellator.INVALID_ENUM = new Tessellator.Constant("INVALID_ENUM",  0x0500);
    Tessellator.INVALID_VALUE = new Tessellator.Constant("INVALID_VALUE",  0x0501);
    Tessellator.INVALID_OPERATION = new Tessellator.Constant("INVALID_OPERATION",  0x0502);
    Tessellator.OUT_OF_MEMORY = new Tessellator.Constant("OUT_OF_MEMORY",  0x0505);

    Tessellator.CW = new Tessellator.Constant("CW",  0x0900);
    Tessellator.CCW = new Tessellator.Constant("CCW",  0x0901);

    Tessellator.LINE_WIDTH = new Tessellator.Constant("LINE_WIDTH",  0x0B21);
    Tessellator.ALIASED_POINT_SIZE_RANGE = new Tessellator.Constant("ALIASED_POINT_SIZE_RANGE",  0x846D);
    Tessellator.ALIASED_LINE_WIDTH_RANGE = new Tessellator.Constant("ALIASED_LINE_WIDTH_RANGE",  0x846E);
    Tessellator.CULL_FACE_MODE = new Tessellator.Constant("CULL_FACE_MODE",  0x0B45);
    Tessellator.FRONT_FACE = new Tessellator.Constant("FRONT_FACE",  0x0B46);
    Tessellator.DEPTH_RANGE = new Tessellator.Constant("DEPTH_RANGE",  0x0B70);
    Tessellator.DEPTH_WRITEMASK = new Tessellator.Constant("DEPTH_WRITEMASK",  0x0B72);
    Tessellator.DEPTH_CLEAR_VALUE = new Tessellator.Constant("DEPTH_CLEAR_VALUE",  0x0B73);
    Tessellator.DEPTH_FUNC = new Tessellator.Constant("DEPTH_FUNC",  0x0B74);
    Tessellator.STENCIL_CLEAR_VALUE = new Tessellator.Constant("STENCIL_CLEAR_VALUE",  0x0B91);
    Tessellator.STENCIL_FUNC = new Tessellator.Constant("STENCIL_FUNC",  0x0B92);
    Tessellator.STENCIL_FAIL = new Tessellator.Constant("STENCIL_FAIL",  0x0B94);
    Tessellator.STENCIL_PASS_DEPTH_FAIL = new Tessellator.Constant("STENCIL_PASS_DEPTH_FAIL",  0x0B95);
    Tessellator.STENCIL_PASS_DEPTH_PASS = new Tessellator.Constant("STENCIL_PASS_DEPTH_PASS",  0x0B96);
    Tessellator.STENCIL_REF = new Tessellator.Constant("STENCIL_REF",  0x0B97);
    Tessellator.STENCIL_VALUE_MASK = new Tessellator.Constant("STENCIL_VALUE_MASK",  0x0B93);
    Tessellator.STENCIL_WRITEMASK = new Tessellator.Constant("STENCIL_WRITEMASK",  0x0B98);
    Tessellator.STENCIL_BACK_FUNC = new Tessellator.Constant("STENCIL_BACK_FUNC",  0x8800);
    Tessellator.STENCIL_BACK_FAIL = new Tessellator.Constant("STENCIL_BACK_FAIL",  0x8801);
    Tessellator.STENCIL_BACK_PASS_DEPTH_FAIL = new Tessellator.Constant("STENCIL_BACK_PASS_DEPTH_FAIL",  0x8802);
    Tessellator.STENCIL_BACK_PASS_DEPTH_PASS = new Tessellator.Constant("STENCIL_BACK_PASS_DEPTH_PASS",  0x8803);
    Tessellator.STENCIL_BACK_REF = new Tessellator.Constant("STENCIL_BACK_REF",  0x8CA3);
    Tessellator.STENCIL_BACK_VALUE_MASK = new Tessellator.Constant("STENCIL_BACK_VALUE_MASK",  0x8CA4);
    Tessellator.STENCIL_BACK_WRITEMASK = new Tessellator.Constant("STENCIL_BACK_WRITEMASK",  0x8CA5);
    Tessellator.VIEWPORT = new Tessellator.Constant("VIEWPORT",  0x0BA2);
    Tessellator.SCISSOR_BOX = new Tessellator.Constant("SCISSOR_BOX",  0x0C10);

    Tessellator.COLOR_CLEAR_VALUE = new Tessellator.Constant("COLOR_CLEAR_VALUE",  0x0C22);
    Tessellator.COLOR_WRITEMASK = new Tessellator.Constant("COLOR_WRITEMASK",  0x0C23);
    Tessellator.UNPACK_ALIGNMENT = new Tessellator.Constant("UNPACK_ALIGNMENT",  0x0CF5);
    Tessellator.PACK_ALIGNMENT = new Tessellator.Constant("PACK_ALIGNMENT",  0x0D05);
    Tessellator.MAX_TEXTURE_SIZE = new Tessellator.Constant("MAX_TEXTURE_SIZE",  0x0D33);
    Tessellator.MAX_VIEWPORT_DIMS = new Tessellator.Constant("MAX_VIEWPORT_DIMS",  0x0D3A);
    Tessellator.SUBPIXEL_BITS = new Tessellator.Constant("SUBPIXEL_BITS",  0x0D50);
    Tessellator.RED_BITS = new Tessellator.Constant("RED_BITS",  0x0D52);
    Tessellator.GREEN_BITS = new Tessellator.Constant("GREEN_BITS",  0x0D53);
    Tessellator.BLUE_BITS = new Tessellator.Constant("BLUE_BITS",  0x0D54);
    Tessellator.ALPHA_BITS = new Tessellator.Constant("ALPHA_BITS",  0x0D55);
    Tessellator.DEPTH_BITS = new Tessellator.Constant("DEPTH_BITS",  0x0D56);
    Tessellator.STENCIL_BITS = new Tessellator.Constant("STENCIL_BITS",  0x0D57);
    Tessellator.POLYGON_OFFSET_UNITS = new Tessellator.Constant("POLYGON_OFFSET_UNITS",  0x2A00);

    Tessellator.POLYGON_OFFSET_FACTOR = new Tessellator.Constant("POLYGON_OFFSET_FACTOR",  0x8038);
    Tessellator.TEXTURE_BINDING_2D = new Tessellator.Constant("TEXTURE_BINDING_2D",  0x8069);
    Tessellator.SAMPLE_BUFFERS = new Tessellator.Constant("SAMPLE_BUFFERS",  0x80A8);
    Tessellator.SAMPLES = new Tessellator.Constant("SAMPLES",  0x80A9);
    Tessellator.SAMPLE_COVERAGE_VALUE = new Tessellator.Constant("SAMPLE_COVERAGE_VALUE",  0x80AA);
    Tessellator.SAMPLE_COVERAGE_INVERT = new Tessellator.Constant("SAMPLE_COVERAGE_INVERT",  0x80AB);

    Tessellator.COMPRESSED_TEXTURE_FORMATS = new Tessellator.Constant("COMPRESSED_TEXTURE_FORMATS",  0x86A3);

    Tessellator.DONT_CARE = new Tessellator.Constant("DONT_CARE",  0x1100);
    Tessellator.FASTEST = new Tessellator.Constant("FASTEST",  0x1101);
    Tessellator.NICEST = new Tessellator.Constant("NICEST",  0x1102);

    Tessellator.GENERATE_MIPMAP_HINT = new Tessellator.Constant("GENERATE_MIPMAP_HINT",  0x8192);

    Tessellator.BYTE = new Tessellator.Constant("BYTE",  0x1400);
    Tessellator.UNSIGNED_BYTE = new Tessellator.Constant("UNSIGNED_BYTE",  0x1401);
    Tessellator.SHORT = new Tessellator.Constant("SHORT",  0x1402);
    Tessellator.UNSIGNED_SHORT = new Tessellator.Constant("UNSIGNED_SHORT",  0x1403);
    Tessellator.INT = new Tessellator.Constant("INT",  0x1404);
    Tessellator.UNSIGNED_INT = new Tessellator.Constant("UNSIGNED_INT",  0x1405);
    Tessellator.FLOAT = new Tessellator.Constant("FLOAT",  0x1406);

    Tessellator.DEPTH_COMPONENT = new Tessellator.Constant("DEPTH_COMPONENT",  0x1902);
    Tessellator.ALPHA = new Tessellator.Constant("ALPHA",  0x1906);
    Tessellator.RGB = new Tessellator.Constant("RGB",  0x1907);
    Tessellator.RGBA = new Tessellator.Constant("RGBA",  0x1908);
    Tessellator.LUMINANCE = new Tessellator.Constant("LUMINANCE",  0x1909);
    Tessellator.LUMINANCE_ALPHA = new Tessellator.Constant("LUMINANCE_ALPHA",  0x190A);

    Tessellator.UNSIGNED_SHORT_4_4_4_4 = new Tessellator.Constant("UNSIGNED_SHORT_4_4_4_4",  0x8033);
    Tessellator.UNSIGNED_SHORT_5_5_5_1 = new Tessellator.Constant("UNSIGNED_SHORT_5_5_5_1",  0x8034);
    Tessellator.UNSIGNED_SHORT_5_6_5 = new Tessellator.Constant("UNSIGNED_SHORT_5_6_5",  0x8363);

    Tessellator.FRAGMENT_SHADER = new Tessellator.Constant("FRAGMENT_SHADER",  0x8B30);
    Tessellator.VERTEX_SHADER = new Tessellator.Constant("VERTEX_SHADER",  0x8B31);
    Tessellator.MAX_VERTEX_ATTRIBS = new Tessellator.Constant("MAX_VERTEX_ATTRIBS",  0x8869);
    Tessellator.MAX_VERTEX_UNIFORM_VECTORS = new Tessellator.Constant("MAX_VERTEX_UNIFORM_VECTORS",  0x8DFB);
    Tessellator.MAX_VARYING_VECTORS = new Tessellator.Constant("MAX_VARYING_VECTORS",  0x8DFC);
    Tessellator.MAX_COMBINED_TEXTURE_IMAGE_UNITS = new Tessellator.Constant("MAX_COMBINED_TEXTURE_IMAGE_UNITS",  0x8B4D);
    Tessellator.MAX_VERTEX_TEXTURE_IMAGE_UNITS = new Tessellator.Constant("MAX_VERTEX_TEXTURE_IMAGE_UNITS",  0x8B4C);
    Tessellator.MAX_TEXTURE_IMAGE_UNITS = new Tessellator.Constant("MAX_TEXTURE_IMAGE_UNITS",  0x8872);
    Tessellator.MAX_FRAGMENT_UNIFORM_VECTORS = new Tessellator.Constant("MAX_FRAGMENT_UNIFORM_VECTORS",  0x8DFD);
    Tessellator.SHADER_TYPE = new Tessellator.Constant("SHADER_TYPE",  0x8B4F);
    Tessellator.DELETE_STATUS = new Tessellator.Constant("DELETE_STATUS",  0x8B80);
    Tessellator.LINK_STATUS = new Tessellator.Constant("LINK_STATUS",  0x8B82);
    Tessellator.VALIDATE_STATUS = new Tessellator.Constant("VALIDATE_STATUS",  0x8B83);
    Tessellator.ATTACHED_SHADERS = new Tessellator.Constant("ATTACHED_SHADERS",  0x8B85);
    Tessellator.ACTIVE_UNIFORMS = new Tessellator.Constant("ACTIVE_UNIFORMS",  0x8B86);
    Tessellator.ACTIVE_ATTRIBUTES = new Tessellator.Constant("ACTIVE_ATTRIBUTES",  0x8B89);
    Tessellator.SHADING_LANGUAGE_VERSION = new Tessellator.Constant("SHADING_LANGUAGE_VERSION",  0x8B8C);
    Tessellator.CURRENT_PROGRAM = new Tessellator.Constant("CURRENT_PROGRAM",  0x8B8D);

    Tessellator.NEVER = new Tessellator.Constant("NEVER",  0x0200);
    Tessellator.LESS = new Tessellator.Constant("LESS",  0x0201);
    Tessellator.EQUAL = new Tessellator.Constant("EQUAL",  0x0202);
    Tessellator.LEQUAL = new Tessellator.Constant("LEQUAL",  0x0203);
    Tessellator.GREATER = new Tessellator.Constant("GREATER",  0x0204);
    Tessellator.NOTEQUAL = new Tessellator.Constant("NOTEQUAL",  0x0205);
    Tessellator.GEQUAL = new Tessellator.Constant("GEQUAL",  0x0206);
    Tessellator.ALWAYS = new Tessellator.Constant("ALWAYS",  0x0207);

    Tessellator.KEEP = new Tessellator.Constant("KEEP",  0x1E00);
    Tessellator.REPLACE = new Tessellator.Constant("REPLACE",  0x1E01);
    Tessellator.INCR = new Tessellator.Constant("INCR",  0x1E02);
    Tessellator.DECR = new Tessellator.Constant("DECR",  0x1E03);
    Tessellator.INVERT = new Tessellator.Constant("INVERT",  0x150A);
    Tessellator.INCR_WRAP = new Tessellator.Constant("INCR_WRAP",  0x8507);
    Tessellator.DECR_WRAP = new Tessellator.Constant("DECR_WRAP",  0x8508);

    Tessellator.VENDOR = new Tessellator.Constant("VENDOR",  0x1F00);
    Tessellator.RENDERER = new Tessellator.Constant("RENDERER",  0x1F01);
    Tessellator.VERSION = new Tessellator.Constant("VERSION",  0x1F02);

    Tessellator.NEAREST = new Tessellator.Constant("NEAREST",  0x2600);
    Tessellator.LINEAR = new Tessellator.Constant("LINEAR",  0x2601);

    Tessellator.NEAREST_MIPMAP_NEAREST = new Tessellator.Constant("NEAREST_MIPMAP_NEAREST",  0x2700);
    Tessellator.LINEAR_MIPMAP_NEAREST = new Tessellator.Constant("LINEAR_MIPMAP_NEAREST",  0x2701);
    Tessellator.NEAREST_MIPMAP_LINEAR = new Tessellator.Constant("NEAREST_MIPMAP_LINEAR",  0x2702);
    Tessellator.LINEAR_MIPMAP_LINEAR = new Tessellator.Constant("LINEAR_MIPMAP_LINEAR",  0x2703);

    Tessellator.TEXTURE_MAG_FILTER = new Tessellator.Constant("TEXTURE_MAG_FILTER",  0x2800);
    Tessellator.TEXTURE_MIN_FILTER = new Tessellator.Constant("TEXTURE_MIN_FILTER",  0x2801);
    Tessellator.TEXTURE_WRAP_S = new Tessellator.Constant("TEXTURE_WRAP_S",  0x2802);
    Tessellator.TEXTURE_WRAP_T = new Tessellator.Constant("TEXTURE_WRAP_T",  0x2803);

    Tessellator.TEXTURE_2D = new Tessellator.Constant("TEXTURE_2D",  0x0DE1);
    Tessellator.TEXTURE = new Tessellator.Constant("TEXTURE",  0x1702);

    Tessellator.TEXTURE_CUBE_MAP = new Tessellator.Constant("TEXTURE_CUBE_MAP",  0x8513);
    Tessellator.TEXTURE_BINDING_CUBE_MAP = new Tessellator.Constant("TEXTURE_BINDING_CUBE_MAP",  0x8514);
    Tessellator.TEXTURE_CUBE_MAP_POSITIVE_X = new Tessellator.Constant("TEXTURE_CUBE_MAP_POSITIVE_X",  0x8515);
    Tessellator.TEXTURE_CUBE_MAP_NEGATIVE_X = new Tessellator.Constant("TEXTURE_CUBE_MAP_NEGATIVE_X",  0x8516);
    Tessellator.TEXTURE_CUBE_MAP_POSITIVE_Y = new Tessellator.Constant("TEXTURE_CUBE_MAP_POSITIVE_Y",  0x8517);
    Tessellator.TEXTURE_CUBE_MAP_NEGATIVE_Y = new Tessellator.Constant("TEXTURE_CUBE_MAP_NEGATIVE_Y",  0x8518);
    Tessellator.TEXTURE_CUBE_MAP_POSITIVE_Z = new Tessellator.Constant("TEXTURE_CUBE_MAP_POSITIVE_Z",  0x8519);
    Tessellator.TEXTURE_CUBE_MAP_NEGATIVE_Z = new Tessellator.Constant("TEXTURE_CUBE_MAP_NEGATIVE_Z",  0x851A);
    Tessellator.MAX_CUBE_MAP_TEXTURE_SIZE = new Tessellator.Constant("MAX_CUBE_MAP_TEXTURE_SIZE",  0x851C);

    Tessellator.TEXTURE0 = new Tessellator.Constant("TEXTURE0",  0x84C0);
    Tessellator.TEXTURE1 = new Tessellator.Constant("TEXTURE1",  0x84C1);
    Tessellator.TEXTURE2 = new Tessellator.Constant("TEXTURE2",  0x84C2);
    Tessellator.TEXTURE3 = new Tessellator.Constant("TEXTURE3",  0x84C3);
    Tessellator.TEXTURE4 = new Tessellator.Constant("TEXTURE4",  0x84C4);
    Tessellator.TEXTURE5 = new Tessellator.Constant("TEXTURE5",  0x84C5);
    Tessellator.TEXTURE6 = new Tessellator.Constant("TEXTURE6",  0x84C6);
    Tessellator.TEXTURE7 = new Tessellator.Constant("TEXTURE7",  0x84C7);
    Tessellator.TEXTURE8 = new Tessellator.Constant("TEXTURE8",  0x84C8);
    Tessellator.TEXTURE9 = new Tessellator.Constant("TEXTURE9",  0x84C9);
    Tessellator.TEXTURE10 = new Tessellator.Constant("TEXTURE10",  0x84CA);
    Tessellator.TEXTURE11 = new Tessellator.Constant("TEXTURE11",  0x84CB);
    Tessellator.TEXTURE12 = new Tessellator.Constant("TEXTURE12",  0x84CC);
    Tessellator.TEXTURE13 = new Tessellator.Constant("TEXTURE13",  0x84CD);
    Tessellator.TEXTURE14 = new Tessellator.Constant("TEXTURE14",  0x84CE);
    Tessellator.TEXTURE15 = new Tessellator.Constant("TEXTURE15",  0x84CF);
    Tessellator.TEXTURE16 = new Tessellator.Constant("TEXTURE16",  0x84D0);
    Tessellator.TEXTURE17 = new Tessellator.Constant("TEXTURE17",  0x84D1);
    Tessellator.TEXTURE18 = new Tessellator.Constant("TEXTURE18",  0x84D2);
    Tessellator.TEXTURE19 = new Tessellator.Constant("TEXTURE19",  0x84D3);
    Tessellator.TEXTURE20 = new Tessellator.Constant("TEXTURE20",  0x84D4);
    Tessellator.TEXTURE21 = new Tessellator.Constant("TEXTURE21",  0x84D5);
    Tessellator.TEXTURE22 = new Tessellator.Constant("TEXTURE22",  0x84D6);
    Tessellator.TEXTURE23 = new Tessellator.Constant("TEXTURE23",  0x84D7);
    Tessellator.TEXTURE24 = new Tessellator.Constant("TEXTURE24",  0x84D8);
    Tessellator.TEXTURE25 = new Tessellator.Constant("TEXTURE25",  0x84D9);
    Tessellator.TEXTURE26 = new Tessellator.Constant("TEXTURE26",  0x84DA);
    Tessellator.TEXTURE27 = new Tessellator.Constant("TEXTURE27",  0x84DB);
    Tessellator.TEXTURE28 = new Tessellator.Constant("TEXTURE28",  0x84DC);
    Tessellator.TEXTURE29 = new Tessellator.Constant("TEXTURE29",  0x84DD);
    Tessellator.TEXTURE30 = new Tessellator.Constant("TEXTURE30",  0x84DE);
    Tessellator.TEXTURE31 = new Tessellator.Constant("TEXTURE31",  0x84DF);
    Tessellator.ACTIVE_TEXTURE = new Tessellator.Constant("ACTIVE_TEXTURE",  0x84E0);

    Tessellator.REPEAT = new Tessellator.Constant("REPEAT",  0x2901);
    Tessellator.CLAMP_TO_EDGE = new Tessellator.Constant("CLAMP_TO_EDGE",  0x812F);
    Tessellator.MIRRORED_REPEAT = new Tessellator.Constant("MIRRORED_REPEAT",  0x8370);

    Tessellator.FLOAT_VEC2 = new Tessellator.Constant("FLOAT_VEC2",  0x8B50);
    Tessellator.FLOAT_VEC3 = new Tessellator.Constant("FLOAT_VEC3",  0x8B51);
    Tessellator.FLOAT_VEC4 = new Tessellator.Constant("FLOAT_VEC4",  0x8B52);
    Tessellator.INT_VEC2 = new Tessellator.Constant("INT_VEC2",  0x8B53);
    Tessellator.INT_VEC3 = new Tessellator.Constant("INT_VEC3",  0x8B54);
    Tessellator.INT_VEC4 = new Tessellator.Constant("INT_VEC4",  0x8B55);
    Tessellator.BOOL = new Tessellator.Constant("BOOL",  0x8B56);
    Tessellator.BOOL_VEC2 = new Tessellator.Constant("BOOL_VEC2",  0x8B57);
    Tessellator.BOOL_VEC3 = new Tessellator.Constant("BOOL_VEC3",  0x8B58);
    Tessellator.BOOL_VEC4 = new Tessellator.Constant("BOOL_VEC4",  0x8B59);
    Tessellator.FLOAT_MAT2 = new Tessellator.Constant("FLOAT_MAT2",  0x8B5A);
    Tessellator.FLOAT_MAT3 = new Tessellator.Constant("FLOAT_MAT3",  0x8B5B);
    Tessellator.FLOAT_MAT4 = new Tessellator.Constant("FLOAT_MAT4",  0x8B5C);
    Tessellator.SAMPLER_2D = new Tessellator.Constant("SAMPLER_2D",  0x8B5E);
    Tessellator.SAMPLER_CUBE = new Tessellator.Constant("SAMPLER_CUBE",  0x8B60);

    Tessellator.VERTEX_ATTRIB_ARRAY_ENABLED = new Tessellator.Constant("VERTEX_ATTRIB_ARRAY_ENABLED",  0x8622);
    Tessellator.VERTEX_ATTRIB_ARRAY_SIZE = new Tessellator.Constant("VERTEX_ATTRIB_ARRAY_SIZE",  0x8623);
    Tessellator.VERTEX_ATTRIB_ARRAY_STRIDE = new Tessellator.Constant("VERTEX_ATTRIB_ARRAY_STRIDE",  0x8624);
    Tessellator.VERTEX_ATTRIB_ARRAY_TYPE = new Tessellator.Constant("VERTEX_ATTRIB_ARRAY_TYPE",  0x8625);
    Tessellator.VERTEX_ATTRIB_ARRAY_NORMALIZED = new Tessellator.Constant("VERTEX_ATTRIB_ARRAY_NORMALIZED",  0x886A);
    Tessellator.VERTEX_ATTRIB_ARRAY_POINTER = new Tessellator.Constant("VERTEX_ATTRIB_ARRAY_POINTER",  0x8645);
    Tessellator.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = new Tessellator.Constant("VERTEX_ATTRIB_ARRAY_BUFFER_BINDING",  0x889F);

    Tessellator.IMPLEMENTATION_COLOR_READ_TYPE = new Tessellator.Constant("IMPLEMENTATION_COLOR_READ_TYPE",  0x8B9A);
    Tessellator.IMPLEMENTATION_COLOR_READ_FORMAT = new Tessellator.Constant("IMPLEMENTATION_COLOR_READ_FORMAT",  0x8B9B);

    Tessellator.COMPILE_STATUS = new Tessellator.Constant("COMPILE_STATUS",  0x8B81);

    Tessellator.LOW_FLOAT = new Tessellator.Constant("LOW_FLOAT",  0x8DF0);
    Tessellator.MEDIUM_FLOAT = new Tessellator.Constant("MEDIUM_FLOAT",  0x8DF1);
    Tessellator.HIGH_FLOAT = new Tessellator.Constant("HIGH_FLOAT",  0x8DF2);
    Tessellator.LOW_INT = new Tessellator.Constant("LOW_INT",  0x8DF3);
    Tessellator.MEDIUM_INT = new Tessellator.Constant("MEDIUM_INT",  0x8DF4);
    Tessellator.HIGH_INT = new Tessellator.Constant("HIGH_INT",  0x8DF5);

    Tessellator.FRAMEBUFFER = new Tessellator.Constant("FRAMEBUFFER",  0x8D40);
    Tessellator.RENDERBUFFER = new Tessellator.Constant("RENDERBUFFER",  0x8D41);

    Tessellator.RGBA4 = new Tessellator.Constant("RGBA4",  0x8056);
    Tessellator.RGB5_A1 = new Tessellator.Constant("RGB5_A1",  0x8057);
    Tessellator.RGB565 = new Tessellator.Constant("RGB565",  0x8D62);
    Tessellator.DEPTH_COMPONENT16 = new Tessellator.Constant("DEPTH_COMPONENT16",  0x81A5);
    Tessellator.STENCIL_INDEX = new Tessellator.Constant("STENCIL_INDEX",  0x1901);
    Tessellator.STENCIL_INDEX8 = new Tessellator.Constant("STENCIL_INDEX8",  0x8D48);
    Tessellator.DEPTH_STENCIL = new Tessellator.Constant("DEPTH_STENCIL",  0x84F9);

    Tessellator.RENDERBUFFER_WIDTH = new Tessellator.Constant("RENDERBUFFER_WIDTH",  0x8D42);
    Tessellator.RENDERBUFFER_HEIGHT = new Tessellator.Constant("RENDERBUFFER_HEIGHT",  0x8D43);
    Tessellator.RENDERBUFFER_INTERNAL_FORMAT = new Tessellator.Constant("RENDERBUFFER_INTERNAL_FORMAT",  0x8D44);
    Tessellator.RENDERBUFFER_RED_SIZE = new Tessellator.Constant("RENDERBUFFER_RED_SIZE",  0x8D50);
    Tessellator.RENDERBUFFER_GREEN_SIZE = new Tessellator.Constant("RENDERBUFFER_GREEN_SIZE",  0x8D51);
    Tessellator.RENDERBUFFER_BLUE_SIZE = new Tessellator.Constant("RENDERBUFFER_BLUE_SIZE",  0x8D52);
    Tessellator.RENDERBUFFER_ALPHA_SIZE = new Tessellator.Constant("RENDERBUFFER_ALPHA_SIZE",  0x8D53);
    Tessellator.RENDERBUFFER_DEPTH_SIZE = new Tessellator.Constant("RENDERBUFFER_DEPTH_SIZE",  0x8D54);
    Tessellator.RENDERBUFFER_STENCIL_SIZE = new Tessellator.Constant("RENDERBUFFER_STENCIL_SIZE",  0x8D55);

    Tessellator.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE",  0x8CD0);
    Tessellator.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_OBJECT_NAME",  0x8CD1);
    Tessellator.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL",  0x8CD2);
    Tessellator.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE",  0x8CD3);

    Tessellator.COLOR_ATTACHMENT0 = new Tessellator.Constant("COLOR_ATTACHMENT0",  0x8CE0);
    Tessellator.DEPTH_ATTACHMENT = new Tessellator.Constant("DEPTH_ATTACHMENT",  0x8D00);
    Tessellator.STENCIL_ATTACHMENT = new Tessellator.Constant("STENCIL_ATTACHMENT",  0x8D20);
    Tessellator.DEPTH_STENCIL_ATTACHMENT = new Tessellator.Constant("DEPTH_STENCIL_ATTACHMENT",  0x821A);

    Tessellator.NONE = new Tessellator.Constant("NONE",  0);

    Tessellator.FRAMEBUFFER_COMPLETE = new Tessellator.Constant("FRAMEBUFFER_COMPLETE",  0x8CD5);
    Tessellator.FRAMEBUFFER_INCOMPLETE_ATTACHMENT = new Tessellator.Constant("FRAMEBUFFER_INCOMPLETE_ATTACHMENT",  0x8CD6);
    Tessellator.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = new Tessellator.Constant("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT",  0x8CD7);
    Tessellator.FRAMEBUFFER_INCOMPLETE_DIMENSIONS = new Tessellator.Constant("FRAMEBUFFER_INCOMPLETE_DIMENSIONS",  0x8CD9);
    Tessellator.FRAMEBUFFER_UNSUPPORTED = new Tessellator.Constant("FRAMEBUFFER_UNSUPPORTED",  0x8CDD);

    Tessellator.FRAMEBUFFER_BINDING = new Tessellator.Constant("FRAMEBUFFER_BINDING",  0x8CA6);
    Tessellator.RENDERBUFFER_BINDING = new Tessellator.Constant("RENDERBUFFER_BINDING",  0x8CA7);
    Tessellator.MAX_RENDERBUFFER_SIZE = new Tessellator.Constant("MAX_RENDERBUFFER_SIZE",  0x84E8);

    Tessellator.INVALID_FRAMEBUFFER_OPERATION = new Tessellator.Constant("INVALID_FRAMEBUFFER_OPERATION",  0x0506);

    Tessellator.UNPACK_FLIP_Y_WEBGL = new Tessellator.Constant("UNPACK_FLIP_Y_WEBGL",  0x9240);
    Tessellator.UNPACK_PREMULTIPLY_ALPHA_WEBGL = new Tessellator.Constant("UNPACK_PREMULTIPLY_ALPHA_WEBGL",  0x9241);
    Tessellator.CONTEXT_LOST_WEBGL = new Tessellator.Constant("CONTEXT_LOST_WEBGL",  0x9242);
    Tessellator.UNPACK_COLORSPACE_CONVERSION_WEBGL = new Tessellator.Constant("UNPACK_COLORSPACE_CONVERSION_WEBGL",  0x9243);
    Tessellator.BROWSER_DEFAULT_WEBGL = new Tessellator.Constant("BROWSER_DEFAULT_WEBGL",  0x9244);
}
{ //webgl 2.0
    Tessellator.READ_BUFFER = new Tessellator.Constant("READ_BUFFER",  0x0C02);
    Tessellator.UNPACK_ROW_LENGTH = new Tessellator.Constant("UNPACK_ROW_LENGTH",  0x0CF2);
    Tessellator.UNPACK_SKIP_ROWS = new Tessellator.Constant("UNPACK_SKIP_ROWS",  0x0CF3);
    Tessellator.UNPACK_SKIP_PIXELS = new Tessellator.Constant("UNPACK_SKIP_PIXELS",  0x0CF4);
    Tessellator.PACK_ROW_LENGTH = new Tessellator.Constant("PACK_ROW_LENGTH",  0x0D02);
    Tessellator.PACK_SKIP_ROWS = new Tessellator.Constant("PACK_SKIP_ROWS",  0x0D03);
    Tessellator.PACK_SKIP_PIXELS = new Tessellator.Constant("PACK_SKIP_PIXELS",  0x0D04);
    Tessellator.COLOR = new Tessellator.Constant("COLOR",  0x1800);
    Tessellator.DEPTH = new Tessellator.Constant("DEPTH",  0x1801);
    Tessellator.STENCIL = new Tessellator.Constant("STENCIL",  0x1802);
    Tessellator.RED = new Tessellator.Constant("RED",  0x1903);
    Tessellator.RGB8 = new Tessellator.Constant("RGB8",  0x8051);
    Tessellator.RGBA8 = new Tessellator.Constant("RGBA8",  0x8058);
    Tessellator.RGB10_A2 = new Tessellator.Constant("RGB10_A2",  0x8059);
    Tessellator.TEXTURE_BINDING_3D = new Tessellator.Constant("TEXTURE_BINDING_3D",  0x806A);
    Tessellator.UNPACK_SKIP_IMAGES = new Tessellator.Constant("UNPACK_SKIP_IMAGES",  0x806D);
    Tessellator.UNPACK_IMAGE_HEIGHT = new Tessellator.Constant("UNPACK_IMAGE_HEIGHT",  0x806E);
    Tessellator.TEXTURE_3D = new Tessellator.Constant("TEXTURE_3D",  0x806F);
    Tessellator.TEXTURE_WRAP_R = new Tessellator.Constant("TEXTURE_WRAP_R",  0x8072);
    Tessellator.MAX_3D_TEXTURE_SIZE = new Tessellator.Constant("MAX_3D_TEXTURE_SIZE",  0x8073);
    Tessellator.UNSIGNED_INT_2_10_10_10_REV = new Tessellator.Constant("UNSIGNED_INT_2_10_10_10_REV",  0x8368);
    Tessellator.MAX_ELEMENTS_VERTICES = new Tessellator.Constant("MAX_ELEMENTS_VERTICES",  0x80E8);
    Tessellator.MAX_ELEMENTS_INDICES = new Tessellator.Constant("MAX_ELEMENTS_INDICES",  0x80E9);
    Tessellator.TEXTURE_MIN_LOD = new Tessellator.Constant("TEXTURE_MIN_LOD",  0x813A);
    Tessellator.TEXTURE_MAX_LOD = new Tessellator.Constant("TEXTURE_MAX_LOD",  0x813B);
    Tessellator.TEXTURE_BASE_LEVEL = new Tessellator.Constant("TEXTURE_BASE_LEVEL",  0x813C);
    Tessellator.TEXTURE_MAX_LEVEL = new Tessellator.Constant("TEXTURE_MAX_LEVEL",  0x813D);
    Tessellator.MIN = new Tessellator.Constant("MIN",  0x8007);
    Tessellator.MAX = new Tessellator.Constant("MAX",  0x8008);
    Tessellator.DEPTH_COMPONENT24 = new Tessellator.Constant("DEPTH_COMPONENT24",  0x81A6);
    Tessellator.MAX_TEXTURE_LOD_BIAS = new Tessellator.Constant("MAX_TEXTURE_LOD_BIAS",  0x84FD);
    Tessellator.TEXTURE_COMPARE_MODE = new Tessellator.Constant("TEXTURE_COMPARE_MODE",  0x884C);
    Tessellator.TEXTURE_COMPARE_FUNC = new Tessellator.Constant("TEXTURE_COMPARE_FUNC",  0x884D);
    Tessellator.CURRENT_QUERY = new Tessellator.Constant("CURRENT_QUERY",  0x8865);
    Tessellator.QUERY_RESULT = new Tessellator.Constant("QUERY_RESULT",  0x8866);
    Tessellator.QUERY_RESULT_AVAILABLE = new Tessellator.Constant("QUERY_RESULT_AVAILABLE",  0x8867);
    Tessellator.STREAM_READ = new Tessellator.Constant("STREAM_READ",  0x88E1);
    Tessellator.STREAM_COPY = new Tessellator.Constant("STREAM_COPY",  0x88E2);
    Tessellator.STATIC_READ = new Tessellator.Constant("STATIC_READ",  0x88E5);
    Tessellator.STATIC_COPY = new Tessellator.Constant("STATIC_COPY",  0x88E6);
    Tessellator.DYNAMIC_READ = new Tessellator.Constant("DYNAMIC_READ",  0x88E9);
    Tessellator.DYNAMIC_COPY = new Tessellator.Constant("DYNAMIC_COPY",  0x88EA);
    Tessellator.MAX_DRAW_BUFFERS = new Tessellator.Constant("MAX_DRAW_BUFFERS",  0x8824);
    Tessellator.DRAW_BUFFER0 = new Tessellator.Constant("DRAW_BUFFER0",  0x8825);
    Tessellator.DRAW_BUFFER1 = new Tessellator.Constant("DRAW_BUFFER1",  0x8826);
    Tessellator.DRAW_BUFFER2 = new Tessellator.Constant("DRAW_BUFFER2",  0x8827);
    Tessellator.DRAW_BUFFER3 = new Tessellator.Constant("DRAW_BUFFER3",  0x8828);
    Tessellator.DRAW_BUFFER4 = new Tessellator.Constant("DRAW_BUFFER4",  0x8829);
    Tessellator.DRAW_BUFFER5 = new Tessellator.Constant("DRAW_BUFFER5",  0x882A);
    Tessellator.DRAW_BUFFER6 = new Tessellator.Constant("DRAW_BUFFER6",  0x882B);
    Tessellator.DRAW_BUFFER7 = new Tessellator.Constant("DRAW_BUFFER7",  0x882C);
    Tessellator.DRAW_BUFFER8 = new Tessellator.Constant("DRAW_BUFFER8",  0x882D);
    Tessellator.DRAW_BUFFER9 = new Tessellator.Constant("DRAW_BUFFER9",  0x882E);
    Tessellator.DRAW_BUFFER10 = new Tessellator.Constant("DRAW_BUFFER10",  0x882F);
    Tessellator.DRAW_BUFFER11 = new Tessellator.Constant("DRAW_BUFFER11",  0x8830);
    Tessellator.DRAW_BUFFER12 = new Tessellator.Constant("DRAW_BUFFER12",  0x8831);
    Tessellator.DRAW_BUFFER13 = new Tessellator.Constant("DRAW_BUFFER13",  0x8832);
    Tessellator.DRAW_BUFFER14 = new Tessellator.Constant("DRAW_BUFFER14",  0x8833);
    Tessellator.DRAW_BUFFER15 = new Tessellator.Constant("DRAW_BUFFER15",  0x8834);
    Tessellator.MAX_FRAGMENT_UNIFORM_COMPONENTS = new Tessellator.Constant("MAX_FRAGMENT_UNIFORM_COMPONENTS",  0x8B49);
    Tessellator.MAX_VERTEX_UNIFORM_COMPONENTS = new Tessellator.Constant("MAX_VERTEX_UNIFORM_COMPONENTS",  0x8B4A);
    Tessellator.SAMPLER_3D = new Tessellator.Constant("SAMPLER_3D",  0x8B5F);
    Tessellator.SAMPLER_2D_SHADOW = new Tessellator.Constant("SAMPLER_2D_SHADOW",  0x8B62);
    Tessellator.FRAGMENT_SHADER_DERIVATIVE_HINT = new Tessellator.Constant("FRAGMENT_SHADER_DERIVATIVE_HINT",  0x8B8B);
    Tessellator.PIXEL_PACK_BUFFER = new Tessellator.Constant("PIXEL_PACK_BUFFER",  0x88EB);
    Tessellator.PIXEL_UNPACK_BUFFER = new Tessellator.Constant("PIXEL_UNPACK_BUFFER",  0x88EC);
    Tessellator.PIXEL_PACK_BUFFER_BINDING = new Tessellator.Constant("PIXEL_PACK_BUFFER_BINDING",  0x88ED);
    Tessellator.PIXEL_UNPACK_BUFFER_BINDING = new Tessellator.Constant("PIXEL_UNPACK_BUFFER_BINDING",  0x88EF);
    Tessellator.FLOAT_MAT2x3 = new Tessellator.Constant("FLOAT_MAT2x3",  0x8B65);
    Tessellator.FLOAT_MAT2x4 = new Tessellator.Constant("FLOAT_MAT2x4",  0x8B66);
    Tessellator.FLOAT_MAT3x2 = new Tessellator.Constant("FLOAT_MAT3x2",  0x8B67);
    Tessellator.FLOAT_MAT3x4 = new Tessellator.Constant("FLOAT_MAT3x4",  0x8B68);
    Tessellator.FLOAT_MAT4x2 = new Tessellator.Constant("FLOAT_MAT4x2",  0x8B69);
    Tessellator.FLOAT_MAT4x3 = new Tessellator.Constant("FLOAT_MAT4x3",  0x8B6A);
    Tessellator.SRGB = new Tessellator.Constant("SRGB",  0x8C40);
    Tessellator.SRGB8 = new Tessellator.Constant("SRGB8",  0x8C41);
    Tessellator.SRGB8_ALPHA8 = new Tessellator.Constant("SRGB8_ALPHA8",  0x8C43);
    Tessellator.COMPARE_REF_TO_TEXTURE = new Tessellator.Constant("COMPARE_REF_TO_TEXTURE",  0x884E);
    Tessellator.RGBA32F = new Tessellator.Constant("RGBA32F",  0x8814);
    Tessellator.RGB32F = new Tessellator.Constant("RGB32F",  0x8815);
    Tessellator.RGBA16F = new Tessellator.Constant("RGBA16F",  0x881A);
    Tessellator.RGB16F = new Tessellator.Constant("RGB16F",  0x881B);
    Tessellator.VERTEX_ATTRIB_ARRAY_INTEGER = new Tessellator.Constant("VERTEX_ATTRIB_ARRAY_INTEGER",  0x88FD);
    Tessellator.MAX_ARRAY_TEXTURE_LAYERS = new Tessellator.Constant("MAX_ARRAY_TEXTURE_LAYERS",  0x88FF);
    Tessellator.MIN_PROGRAM_TEXEL_OFFSET = new Tessellator.Constant("MIN_PROGRAM_TEXEL_OFFSET",  0x8904);
    Tessellator.MAX_PROGRAM_TEXEL_OFFSET = new Tessellator.Constant("MAX_PROGRAM_TEXEL_OFFSET",  0x8905);
    Tessellator.MAX_VARYING_COMPONENTS = new Tessellator.Constant("MAX_VARYING_COMPONENTS",  0x8B4B);
    Tessellator.TEXTURE_2D_ARRAY = new Tessellator.Constant("TEXTURE_2D_ARRAY",  0x8C1A);
    Tessellator.TEXTURE_BINDING_2D_ARRAY = new Tessellator.Constant("TEXTURE_BINDING_2D_ARRAY",  0x8C1D);
    Tessellator.R11F_G11F_B10F = new Tessellator.Constant("R11F_G11F_B10F",  0x8C3A);
    Tessellator.UNSIGNED_INT_10F_11F_11F_REV = new Tessellator.Constant("UNSIGNED_INT_10F_11F_11F_REV",  0x8C3B);
    Tessellator.RGB9_E5 = new Tessellator.Constant("RGB9_E5",  0x8C3D);
    Tessellator.UNSIGNED_INT_5_9_9_9_REV = new Tessellator.Constant("UNSIGNED_INT_5_9_9_9_REV",  0x8C3E);
    Tessellator.TRANSFORM_FEEDBACK_BUFFER_MODE = new Tessellator.Constant("TRANSFORM_FEEDBACK_BUFFER_MODE",  0x8C7F);
    Tessellator.MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS = new Tessellator.Constant("MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS",  0x8C80);
    Tessellator.TRANSFORM_FEEDBACK_VARYINGS = new Tessellator.Constant("TRANSFORM_FEEDBACK_VARYINGS",  0x8C83);
    Tessellator.TRANSFORM_FEEDBACK_BUFFER_START = new Tessellator.Constant("TRANSFORM_FEEDBACK_BUFFER_START",  0x8C84);
    Tessellator.TRANSFORM_FEEDBACK_BUFFER_SIZE = new Tessellator.Constant("TRANSFORM_FEEDBACK_BUFFER_SIZE",  0x8C85);
    Tessellator.TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN = new Tessellator.Constant("TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN",  0x8C88);
    Tessellator.RASTERIZER_DISCARD = new Tessellator.Constant("RASTERIZER_DISCARD",  0x8C89);
    Tessellator.MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS = new Tessellator.Constant("MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS",  0x8C8A);
    Tessellator.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS = new Tessellator.Constant("MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS",  0x8C8B);
    Tessellator.INTERLEAVED_ATTRIBS = new Tessellator.Constant("INTERLEAVED_ATTRIBS",  0x8C8C);
    Tessellator.SEPARATE_ATTRIBS = new Tessellator.Constant("SEPARATE_ATTRIBS",  0x8C8D);
    Tessellator.TRANSFORM_FEEDBACK_BUFFER = new Tessellator.Constant("TRANSFORM_FEEDBACK_BUFFER",  0x8C8E);
    Tessellator.TRANSFORM_FEEDBACK_BUFFER_BINDING = new Tessellator.Constant("TRANSFORM_FEEDBACK_BUFFER_BINDING",  0x8C8F);
    Tessellator.RGBA32UI = new Tessellator.Constant("RGBA32UI",  0x8D70);
    Tessellator.RGB32UI = new Tessellator.Constant("RGB32UI",  0x8D71);
    Tessellator.RGBA16UI = new Tessellator.Constant("RGBA16UI",  0x8D76);
    Tessellator.RGB16UI = new Tessellator.Constant("RGB16UI",  0x8D77);
    Tessellator.RGBA8UI = new Tessellator.Constant("RGBA8UI",  0x8D7C);
    Tessellator.RGB8UI = new Tessellator.Constant("RGB8UI",  0x8D7D);
    Tessellator.RGBA32I = new Tessellator.Constant("RGBA32I",  0x8D82);
    Tessellator.RGB32I = new Tessellator.Constant("RGB32I",  0x8D83);
    Tessellator.RGBA16I = new Tessellator.Constant("RGBA16I",  0x8D88);
    Tessellator.RGB16I = new Tessellator.Constant("RGB16I",  0x8D89);
    Tessellator.RGBA8I = new Tessellator.Constant("RGBA8I",  0x8D8E);
    Tessellator.RGB8I = new Tessellator.Constant("RGB8I",  0x8D8F);
    Tessellator.RED_INTEGER = new Tessellator.Constant("RED_INTEGER",  0x8D94);
    Tessellator.RGB_INTEGER = new Tessellator.Constant("RGB_INTEGER",  0x8D98);
    Tessellator.RGBA_INTEGER = new Tessellator.Constant("RGBA_INTEGER",  0x8D99);
    Tessellator.SAMPLER_2D_ARRAY = new Tessellator.Constant("SAMPLER_2D_ARRAY",  0x8DC1);
    Tessellator.SAMPLER_2D_ARRAY_SHADOW = new Tessellator.Constant("SAMPLER_2D_ARRAY_SHADOW",  0x8DC4);
    Tessellator.SAMPLER_CUBE_SHADOW = new Tessellator.Constant("SAMPLER_CUBE_SHADOW",  0x8DC5);
    Tessellator.UNSIGNED_INT_VEC2 = new Tessellator.Constant("UNSIGNED_INT_VEC2",  0x8DC6);
    Tessellator.UNSIGNED_INT_VEC3 = new Tessellator.Constant("UNSIGNED_INT_VEC3",  0x8DC7);
    Tessellator.UNSIGNED_INT_VEC4 = new Tessellator.Constant("UNSIGNED_INT_VEC4",  0x8DC8);
    Tessellator.INT_SAMPLER_2D = new Tessellator.Constant("INT_SAMPLER_2D",  0x8DCA);
    Tessellator.INT_SAMPLER_3D = new Tessellator.Constant("INT_SAMPLER_3D",  0x8DCB);
    Tessellator.INT_SAMPLER_CUBE = new Tessellator.Constant("INT_SAMPLER_CUBE",  0x8DCC);
    Tessellator.INT_SAMPLER_2D_ARRAY = new Tessellator.Constant("INT_SAMPLER_2D_ARRAY",  0x8DCF);
    Tessellator.UNSIGNED_INT_SAMPLER_2D = new Tessellator.Constant("UNSIGNED_INT_SAMPLER_2D",  0x8DD2);
    Tessellator.UNSIGNED_INT_SAMPLER_3D = new Tessellator.Constant("UNSIGNED_INT_SAMPLER_3D",  0x8DD3);
    Tessellator.UNSIGNED_INT_SAMPLER_CUBE = new Tessellator.Constant("UNSIGNED_INT_SAMPLER_CUBE",  0x8DD4);
    Tessellator.UNSIGNED_INT_SAMPLER_2D_ARRAY = new Tessellator.Constant("UNSIGNED_INT_SAMPLER_2D_ARRAY",  0x8DD7);
    Tessellator.DEPTH_COMPONENT32F = new Tessellator.Constant("DEPTH_COMPONENT32F",  0x8CAC);
    Tessellator.DEPTH32F_STENCIL8 = new Tessellator.Constant("DEPTH32F_STENCIL8",  0x8CAD);
    Tessellator.FLOAT_32_UNSIGNED_INT_24_8_REV = new Tessellator.Constant("FLOAT_32_UNSIGNED_INT_24_8_REV",  0x8DAD);
    Tessellator.FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING",  0x8210);
    Tessellator.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE",  0x8211);
    Tessellator.FRAMEBUFFER_ATTACHMENT_RED_SIZE = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_RED_SIZE",  0x8212);
    Tessellator.FRAMEBUFFER_ATTACHMENT_GREEN_SIZE = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_GREEN_SIZE",  0x8213);
    Tessellator.FRAMEBUFFER_ATTACHMENT_BLUE_SIZE = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_BLUE_SIZE",  0x8214);
    Tessellator.FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE",  0x8215);
    Tessellator.FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE",  0x8216);
    Tessellator.FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE",  0x8217);
    Tessellator.FRAMEBUFFER_DEFAULT = new Tessellator.Constant("FRAMEBUFFER_DEFAULT",  0x8218);
    Tessellator.DEPTH_STENCIL_ATTACHMENT = new Tessellator.Constant("DEPTH_STENCIL_ATTACHMENT",  0x821A);
    Tessellator.DEPTH_STENCIL = new Tessellator.Constant("DEPTH_STENCIL",  0x84F9);
    Tessellator.UNSIGNED_INT_24_8 = new Tessellator.Constant("UNSIGNED_INT_24_8",  0x84FA);
    Tessellator.DEPTH24_STENCIL8 = new Tessellator.Constant("DEPTH24_STENCIL8",  0x88F0);
    Tessellator.UNSIGNED_NORMALIZED = new Tessellator.Constant("UNSIGNED_NORMALIZED",  0x8C17);
    Tessellator.DRAW_FRAMEBUFFER_BINDING = new Tessellator.Constant("DRAW_FRAMEBUFFER_BINDING",  0x8CA6);
    Tessellator.READ_FRAMEBUFFER = new Tessellator.Constant("READ_FRAMEBUFFER",  0x8CA8);
    Tessellator.DRAW_FRAMEBUFFER = new Tessellator.Constant("DRAW_FRAMEBUFFER",  0x8CA9);
    Tessellator.READ_FRAMEBUFFER_BINDING = new Tessellator.Constant("READ_FRAMEBUFFER_BINDING",  0x8CAA);
    Tessellator.RENDERBUFFER_SAMPLES = new Tessellator.Constant("RENDERBUFFER_SAMPLES",  0x8CAB);
    Tessellator.FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER = new Tessellator.Constant("FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER",  0x8CD4);
    Tessellator.MAX_COLOR_ATTACHMENTS = new Tessellator.Constant("MAX_COLOR_ATTACHMENTS",  0x8CDF);
    Tessellator.COLOR_ATTACHMENT1 = new Tessellator.Constant("COLOR_ATTACHMENT1",  0x8CE1);
    Tessellator.COLOR_ATTACHMENT2 = new Tessellator.Constant("COLOR_ATTACHMENT2",  0x8CE2);
    Tessellator.COLOR_ATTACHMENT3 = new Tessellator.Constant("COLOR_ATTACHMENT3",  0x8CE3);
    Tessellator.COLOR_ATTACHMENT4 = new Tessellator.Constant("COLOR_ATTACHMENT4",  0x8CE4);
    Tessellator.COLOR_ATTACHMENT5 = new Tessellator.Constant("COLOR_ATTACHMENT5",  0x8CE5);
    Tessellator.COLOR_ATTACHMENT6 = new Tessellator.Constant("COLOR_ATTACHMENT6",  0x8CE6);
    Tessellator.COLOR_ATTACHMENT7 = new Tessellator.Constant("COLOR_ATTACHMENT7",  0x8CE7);
    Tessellator.COLOR_ATTACHMENT8 = new Tessellator.Constant("COLOR_ATTACHMENT8",  0x8CE8);
    Tessellator.COLOR_ATTACHMENT9 = new Tessellator.Constant("COLOR_ATTACHMENT9",  0x8CE9);
    Tessellator.COLOR_ATTACHMENT10 = new Tessellator.Constant("COLOR_ATTACHMENT10",  0x8CEA);
    Tessellator.COLOR_ATTACHMENT11 = new Tessellator.Constant("COLOR_ATTACHMENT11",  0x8CEB);
    Tessellator.COLOR_ATTACHMENT12 = new Tessellator.Constant("COLOR_ATTACHMENT12",  0x8CEC);
    Tessellator.COLOR_ATTACHMENT13 = new Tessellator.Constant("COLOR_ATTACHMENT13",  0x8CED);
    Tessellator.COLOR_ATTACHMENT14 = new Tessellator.Constant("COLOR_ATTACHMENT14",  0x8CEE);
    Tessellator.COLOR_ATTACHMENT15 = new Tessellator.Constant("COLOR_ATTACHMENT15",  0x8CEF);
    Tessellator.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE = new Tessellator.Constant("FRAMEBUFFER_INCOMPLETE_MULTISAMPLE",  0x8D56);
    Tessellator.MAX_SAMPLES = new Tessellator.Constant("MAX_SAMPLES",  0x8D57);
    Tessellator.HALF_FLOAT = new Tessellator.Constant("HALF_FLOAT",  0x140B);
    Tessellator.RG = new Tessellator.Constant("RG",  0x8227);
    Tessellator.RG_INTEGER = new Tessellator.Constant("RG_INTEGER",  0x8228);
    Tessellator.R8 = new Tessellator.Constant("R8",  0x8229);
    Tessellator.RG8 = new Tessellator.Constant("RG8",  0x822B);
    Tessellator.R16F = new Tessellator.Constant("R16F",  0x822D);
    Tessellator.R32F = new Tessellator.Constant("R32F",  0x822E);
    Tessellator.RG16F = new Tessellator.Constant("RG16F",  0x822F);
    Tessellator.RG32F = new Tessellator.Constant("RG32F",  0x8230);
    Tessellator.R8I = new Tessellator.Constant("R8I",  0x8231);
    Tessellator.R8UI = new Tessellator.Constant("R8UI",  0x8232);
    Tessellator.R16I = new Tessellator.Constant("R16I",  0x8233);
    Tessellator.R16UI = new Tessellator.Constant("R16UI",  0x8234);
    Tessellator.R32I = new Tessellator.Constant("R32I",  0x8235);
    Tessellator.R32UI = new Tessellator.Constant("R32UI",  0x8236);
    Tessellator.RG8I = new Tessellator.Constant("RG8I",  0x8237);
    Tessellator.RG8UI = new Tessellator.Constant("RG8UI",  0x8238);
    Tessellator.RG16I = new Tessellator.Constant("RG16I",  0x8239);
    Tessellator.RG16UI = new Tessellator.Constant("RG16UI",  0x823A);
    Tessellator.RG32I = new Tessellator.Constant("RG32I",  0x823B);
    Tessellator.RG32UI = new Tessellator.Constant("RG32UI",  0x823C);
    Tessellator.VERTEX_ARRAY_BINDING = new Tessellator.Constant("VERTEX_ARRAY_BINDING",  0x85B5);
    Tessellator.R8_SNORM = new Tessellator.Constant("R8_SNORM",  0x8F94);
    Tessellator.RG8_SNORM = new Tessellator.Constant("RG8_SNORM",  0x8F95);
    Tessellator.RGB8_SNORM = new Tessellator.Constant("RGB8_SNORM",  0x8F96);
    Tessellator.RGBA8_SNORM = new Tessellator.Constant("RGBA8_SNORM",  0x8F97);
    Tessellator.SIGNED_NORMALIZED = new Tessellator.Constant("SIGNED_NORMALIZED",  0x8F9C);
    Tessellator.COPY_READ_BUFFER = new Tessellator.Constant("COPY_READ_BUFFER",  0x8F36);
    Tessellator.COPY_WRITE_BUFFER = new Tessellator.Constant("COPY_WRITE_BUFFER",  0x8F37);
    Tessellator.COPY_READ_BUFFER_BINDING = new Tessellator.Constant("COPY_READ_BUFFER_BINDING",  0x8F36);
    Tessellator.COPY_WRITE_BUFFER_BINDING = new Tessellator.Constant("COPY_WRITE_BUFFER_BINDING",  0x8F37);
    Tessellator.UNIFORM_BUFFER = new Tessellator.Constant("UNIFORM_BUFFER",  0x8A11);
    Tessellator.UNIFORM_BUFFER_BINDING = new Tessellator.Constant("UNIFORM_BUFFER_BINDING",  0x8A28);
    Tessellator.UNIFORM_BUFFER_START = new Tessellator.Constant("UNIFORM_BUFFER_START",  0x8A29);
    Tessellator.UNIFORM_BUFFER_SIZE = new Tessellator.Constant("UNIFORM_BUFFER_SIZE",  0x8A2A);
    Tessellator.MAX_VERTEX_UNIFORM_BLOCKS = new Tessellator.Constant("MAX_VERTEX_UNIFORM_BLOCKS",  0x8A2B);
    Tessellator.MAX_FRAGMENT_UNIFORM_BLOCKS = new Tessellator.Constant("MAX_FRAGMENT_UNIFORM_BLOCKS",  0x8A2D);
    Tessellator.MAX_COMBINED_UNIFORM_BLOCKS = new Tessellator.Constant("MAX_COMBINED_UNIFORM_BLOCKS",  0x8A2E);
    Tessellator.MAX_UNIFORM_BUFFER_BINDINGS = new Tessellator.Constant("MAX_UNIFORM_BUFFER_BINDINGS",  0x8A2F);
    Tessellator.MAX_UNIFORM_BLOCK_SIZE = new Tessellator.Constant("MAX_UNIFORM_BLOCK_SIZE",  0x8A30);
    Tessellator.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS = new Tessellator.Constant("MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS",  0x8A31);
    Tessellator.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS = new Tessellator.Constant("MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS",  0x8A33);
    Tessellator.UNIFORM_BUFFER_OFFSET_ALIGNMENT = new Tessellator.Constant("UNIFORM_BUFFER_OFFSET_ALIGNMENT",  0x8A34);
    Tessellator.ACTIVE_UNIFORM_BLOCKS = new Tessellator.Constant("ACTIVE_UNIFORM_BLOCKS",  0x8A36);
    Tessellator.UNIFORM_TYPE = new Tessellator.Constant("UNIFORM_TYPE",  0x8A37);
    Tessellator.UNIFORM_SIZE = new Tessellator.Constant("UNIFORM_SIZE",  0x8A38);
    Tessellator.UNIFORM_BLOCK_INDEX = new Tessellator.Constant("UNIFORM_BLOCK_INDEX",  0x8A3A);
    Tessellator.UNIFORM_OFFSET = new Tessellator.Constant("UNIFORM_OFFSET",  0x8A3B);
    Tessellator.UNIFORM_ARRAY_STRIDE = new Tessellator.Constant("UNIFORM_ARRAY_STRIDE",  0x8A3C);
    Tessellator.UNIFORM_MATRIX_STRIDE = new Tessellator.Constant("UNIFORM_MATRIX_STRIDE",  0x8A3D);
    Tessellator.UNIFORM_IS_ROW_MAJOR = new Tessellator.Constant("UNIFORM_IS_ROW_MAJOR",  0x8A3E);
    Tessellator.UNIFORM_BLOCK_BINDING = new Tessellator.Constant("UNIFORM_BLOCK_BINDING",  0x8A3F);
    Tessellator.UNIFORM_BLOCK_DATA_SIZE = new Tessellator.Constant("UNIFORM_BLOCK_DATA_SIZE",  0x8A40);
    Tessellator.UNIFORM_BLOCK_ACTIVE_UNIFORMS = new Tessellator.Constant("UNIFORM_BLOCK_ACTIVE_UNIFORMS",  0x8A42);
    Tessellator.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES = new Tessellator.Constant("UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES",  0x8A43);
    Tessellator.UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER = new Tessellator.Constant("UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER",  0x8A44);
    Tessellator.UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER = new Tessellator.Constant("UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER",  0x8A46);
    Tessellator.INVALID_INDEX = new Tessellator.Constant("INVALID_INDEX",  0xFFFFFFFF);
    Tessellator.MAX_VERTEX_OUTPUT_COMPONENTS = new Tessellator.Constant("MAX_VERTEX_OUTPUT_COMPONENTS",  0x9122);
    Tessellator.MAX_FRAGMENT_INPUT_COMPONENTS = new Tessellator.Constant("MAX_FRAGMENT_INPUT_COMPONENTS",  0x9125);
    Tessellator.MAX_SERVER_WAIT_TIMEOUT = new Tessellator.Constant("MAX_SERVER_WAIT_TIMEOUT",  0x9111);
    Tessellator.OBJECT_TYPE = new Tessellator.Constant("OBJECT_TYPE",  0x9112);
    Tessellator.SYNC_CONDITION = new Tessellator.Constant("SYNC_CONDITION",  0x9113);
    Tessellator.SYNC_STATUS = new Tessellator.Constant("SYNC_STATUS",  0x9114);
    Tessellator.SYNC_FLAGS = new Tessellator.Constant("SYNC_FLAGS",  0x9115);
    Tessellator.SYNC_FENCE = new Tessellator.Constant("SYNC_FENCE",  0x9116);
    Tessellator.SYNC_GPU_COMMANDS_COMPLETE = new Tessellator.Constant("SYNC_GPU_COMMANDS_COMPLETE",  0x9117);
    Tessellator.UNSIGNALED = new Tessellator.Constant("UNSIGNALED",  0x9118);
    Tessellator.SIGNALED = new Tessellator.Constant("SIGNALED",  0x9119);
    Tessellator.ALREADY_SIGNALED = new Tessellator.Constant("ALREADY_SIGNALED",  0x911A);
    Tessellator.TIMEOUT_EXPIRED = new Tessellator.Constant("TIMEOUT_EXPIRED",  0x911B);
    Tessellator.CONDITION_SATISFIED = new Tessellator.Constant("CONDITION_SATISFIED",  0x911C);
    Tessellator.WAIT_FAILED = new Tessellator.Constant("WAIT_FAILED",  0x911D);
    Tessellator.SYNC_FLUSH_COMMANDS_BIT = new Tessellator.Constant("SYNC_FLUSH_COMMANDS_BIT",  0x00000001);
    Tessellator.VERTEX_ATTRIB_ARRAY_DIVISOR = new Tessellator.Constant("VERTEX_ATTRIB_ARRAY_DIVISOR",  0x88FE);
    Tessellator.ANY_SAMPLES_PASSED = new Tessellator.Constant("ANY_SAMPLES_PASSED",  0x8C2F);
    Tessellator.ANY_SAMPLES_PASSED_CONSERVATIVE = new Tessellator.Constant("ANY_SAMPLES_PASSED_CONSERVATIVE",  0x8D6A);
    Tessellator.SAMPLER_BINDING = new Tessellator.Constant("SAMPLER_BINDING",  0x8919);
    Tessellator.RGB10_A2UI = new Tessellator.Constant("RGB10_A2UI",  0x906F);
    Tessellator.INT_2_10_10_10_REV = new Tessellator.Constant("INT_2_10_10_10_REV",  0x8D9F);
    Tessellator.TRANSFORM_FEEDBACK = new Tessellator.Constant("TRANSFORM_FEEDBACK",  0x8E22);
    Tessellator.TRANSFORM_FEEDBACK_PAUSED = new Tessellator.Constant("TRANSFORM_FEEDBACK_PAUSED",  0x8E23);
    Tessellator.TRANSFORM_FEEDBACK_ACTIVE = new Tessellator.Constant("TRANSFORM_FEEDBACK_ACTIVE",  0x8E24);
    Tessellator.TRANSFORM_FEEDBACK_BINDING = new Tessellator.Constant("TRANSFORM_FEEDBACK_BINDING",  0x8E25);
    Tessellator.COMPRESSED_R11_EAC = new Tessellator.Constant("COMPRESSED_R11_EAC",  0x9270);
    Tessellator.COMPRESSED_SIGNED_R11_EAC = new Tessellator.Constant("COMPRESSED_SIGNED_R11_EAC",  0x9271);
    Tessellator.COMPRESSED_RG11_EAC = new Tessellator.Constant("COMPRESSED_RG11_EAC",  0x9272);
    Tessellator.COMPRESSED_SIGNED_RG11_EAC = new Tessellator.Constant("COMPRESSED_SIGNED_RG11_EAC",  0x9273);
    Tessellator.COMPRESSED_RGB8_ETC2 = new Tessellator.Constant("COMPRESSED_RGB8_ETC2",  0x9274);
    Tessellator.COMPRESSED_SRGB8_ETC2 = new Tessellator.Constant("COMPRESSED_SRGB8_ETC2",  0x9275);
    Tessellator.COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2 = new Tessellator.Constant("COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2",  0x9276);
    Tessellator.COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2 = new Tessellator.Constant("COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2",  0x9277);
    Tessellator.COMPRESSED_RGBA8_ETC2_EAC = new Tessellator.Constant("COMPRESSED_RGBA8_ETC2_EAC",  0x9278);
    Tessellator.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC = new Tessellator.Constant("COMPRESSED_SRGB8_ALPHA8_ETC2_EAC",  0x9279);
    Tessellator.TEXTURE_IMMUTABLE_FORMAT = new Tessellator.Constant("TEXTURE_IMMUTABLE_FORMAT",  0x912F);
    Tessellator.MAX_ELEMENT_INDEX = new Tessellator.Constant("MAX_ELEMENT_INDEX",  0x8D6B);
    Tessellator.TEXTURE_IMMUTABLE_LEVELS = new Tessellator.Constant("TEXTURE_IMMUTABLE_LEVELS",  0x82DF);
}
{ //tessellator
    Tessellator.COLOR = Tessellator.Constant.create("COLOR");
    Tessellator.VERTEX = Tessellator.Constant.create("VERTEX");
    Tessellator.TRANSLATE = Tessellator.Constant.create("TRANSLATE");
    Tessellator.ROTATE = Tessellator.Constant.create("ROTATE");
    Tessellator.SCALE = Tessellator.Constant.create("SCALE");
    Tessellator.START = Tessellator.Constant.create("START");
    Tessellator.END = Tessellator.Constant.create("END");
    Tessellator.OBJECT = Tessellator.Constant.create("OBJECT");
    Tessellator.MODEL = Tessellator.Constant.create("MODEL");
    Tessellator.MODEL_FRAGMENT = Tessellator.Constant.create("MODEL_FRAGMENT");
    Tessellator.TEXTURE = Tessellator.Constant.create("TEXTURE");
    Tessellator.TEXTURE_SCALE = Tessellator.Constant.create("TEXTURE_SCALE");
    Tessellator.NORMAL = Tessellator.Constant.create("NORMAL");
    Tessellator.TEXT = Tessellator.Constant.create("TEXT");
    Tessellator.ENABLE = Tessellator.Constant.create("ENABLE");
    Tessellator.DISABLE = Tessellator.Constant.create("DISABLE");
    Tessellator.MASK = Tessellator.Constant.create("MASK");
    Tessellator.FLUSH = Tessellator.Constant.create("FLUSH");
    Tessellator.FONT_SHEET = Tessellator.Constant.create("FONT_SHEET");
    Tessellator.VIEW = Tessellator.Constant.create("VIEW");
    Tessellator.CAMERA = Tessellator.Constant.create("CAMERA");
    Tessellator.LIGHTING = Tessellator.Constant.create("LIGHTING");
    Tessellator.LIGHTING_AMBIENT = Tessellator.Constant.create("LIGHTING_AMBIENT");
    Tessellator.LIGHTING_DIRECTIONAL = Tessellator.Constant.create("LIGHTING_DIRECTIONAL");
    Tessellator.LIGHTING_POINT = Tessellator.Constant.create("LIGHTING_POINT");
    Tessellator.LIGHTING_SPECULAR = Tessellator.Constant.create("LIGHTING_SPECULAR");
    Tessellator.LIGHTING_SPOT = Tessellator.Constant.create("LIGHTING_SPOT");
    Tessellator.LINE_WIDTH = Tessellator.Constant.create("LINE_WIDTH");
    Tessellator.FLATTEN = Tessellator.Constant.create("FLATTEN");
    Tessellator.CLIP = Tessellator.Constant.create("CLIP");
    Tessellator.CLEAR = Tessellator.Constant.create("CLEAR");
    Tessellator.ALL = Tessellator.Constant.create("ALL");
    Tessellator.PIXEL_SHADER = Tessellator.Constant.create("PIXEL_SHADER");
    Tessellator.CHANGED = Tessellator.Constant.create("CHANGED");
    Tessellator.BLEND_FUNC = Tessellator.Constant.create("BLEND_FUNC");
    Tessellator.INDICES = Tessellator.Constant.create("INDICES");
    
    Tessellator.PUSH = Tessellator.Constant.create("PUSH");
    Tessellator.POP = Tessellator.Constant.create("PUSH");
    Tessellator.RESET = Tessellator.Constant.create("PUSH");
    
    Tessellator.STATIC = Tessellator.Constant.create("STATIC_DRAW");
    Tessellator.DYNAMIC = Tessellator.Constant.create("DYNAMIC_DRAW");
    Tessellator.STREAM = Tessellator.Constant.create("STREAM_DRAW");
    
    Tessellator.FLOAT = Tessellator.Constant.create("FLOAT", 1);
    Tessellator.VEC2 = Tessellator.Constant.create("VEC2", 2);
    Tessellator.VEC3 = Tessellator.Constant.create("VEC3", 3);
    Tessellator.VEC4 = Tessellator.Constant.create("VEC4", 4);
    
    Tessellator.TRIANGLE = Tessellator.Constant.create("TRIANGLES");
    Tessellator.TRIANGLE_STRIP = Tessellator.Constant.create("TRIANGLE_STRIP");
    Tessellator.TRIANGLE_FAN_CW = Tessellator.Constant.create("TRIANGLE_FAN_CW");
    Tessellator.TRIANGLE_FAN_CCW = Tessellator.Constant.create("TRIANGLE_FAN_CCW");
    Tessellator.LINE = Tessellator.Constant.create("LINES");
    Tessellator.LINE_STRIP = Tessellator.Constant.create("LINE_STRIP");
    Tessellator.LINE_LOOP = Tessellator.Constant.create("LINE_LOOP");
    Tessellator.POINT = Tessellator.Constant.create("POINTS");
    Tessellator.QUAD = Tessellator.Constant.create("QUAD");
    Tessellator.POLYGON = Tessellator.Constant.create("POLYGON");
    
    Tessellator.CENTER = Tessellator.Constant.create("CENTER", 0);
    Tessellator.RIGHT = Tessellator.Constant.create("RIGHT", 1);
    Tessellator.LEFT = Tessellator.Constant.create("LEFT", -1);
    Tessellator.TOP = Tessellator.Constant.create("TOP", 1);
    Tessellator.BOTTOM = Tessellator.Constant.create("BOTTOM", -1);
    
    Tessellator.BLEND_DEFAULT = [Tessellator.SRC_ALPHA, Tessellator.ONE_MINUS_SRC_ALPHA];
    Tessellator.BLEND_INVERT = [Tessellator.ONE_MINUS_DST_COLOR, Tessellator.ZERO];
    
    Tessellator.COLOR_WHITE = Tessellator.vec4(1, 1, 1, 1);
    Tessellator.COLOR_BLACK = Tessellator.vec4(0, 0, 0, 1);
    Tessellator.COLOR_GRAY = Tessellator.vec4(0.5, 0.5, 0.5, 1);
	Tessellator.COLOR_LIGHT_GRAY = Tessellator.vec4(0.75, 0.75, 0.75, 1);
	Tessellator.COLOR_DARK_GRAY = Tessellator.vec4(0.25, 0.25, 0.25, 1);
    Tessellator.COLOR_RED = Tessellator.vec4(1, 0, 0, 1);
    Tessellator.COLOR_GREEN = Tessellator.vec4(0, 1, 0, 1);
    Tessellator.COLOR_BLUE = Tessellator.vec4(0, 0, 1, 1);
    Tessellator.COLOR_YELLOW = Tessellator.vec4(1, 1, 0, 1);
    Tessellator.COLOR_CYAN = Tessellator.vec4(0, 1, 1, 1);
    Tessellator.COLOR_MAGENTA = Tessellator.vec4(1, 0, 1, 1);
    Tessellator.COLOR_PINK = Tessellator.vec4(1, 0.7529, 0.796, 1);
    Tessellator.COLOR_LIGHT_PINK = Tessellator.vec4(1, 0.7137, 0.7569, 1);
    Tessellator.COLOR_PURPLE = Tessellator.vec4(0.5, 0, 0.5, 1);
    Tessellator.COLOR_VIOLET = Tessellator.vec4(0.9334, 0.5098, 9.3334, 1);
    Tessellator.COLOR_INDIGO = Tessellator.vec4(0.2941, 0, 0.5098, 1);
    Tessellator.COLOR_NAVY = Tessellator.vec4(0, 0, 0.5, 1);
    Tessellator.COLOR_MAROON = Tessellator.vec4(0.5, 0, 0, 1);
    Tessellator.COLOR_DARK_RED = Tessellator.vec4(0.543, 0, 0, 1);
    Tessellator.COLOR_BROWN = Tessellator.vec4(0.6445, 0.164, 0.164, 1);
    Tessellator.COLOR_FIRE_BRICK = Tessellator.vec4(0.6953, 0.1328, 0.1328, 1);
    Tessellator.COLOR_CRIMSON = Tessellator.vec4(0.8594, 0.0755, 0.2344, 1);
    Tessellator.COLOR_TOMATO = Tessellator.vec4(1, 0.164, 0.164, 1);
    Tessellator.COLOR_CORAL = Tessellator.vec4(1, 0.5, 0.3125, 1);
    Tessellator.COLOR_INDIAN_RED = Tessellator.vec4(0.8008, 0.3594, 0.3594, 1);
    Tessellator.COLOR_AMBER = Tessellator.vec4(1, 0.4921, 0, 1);
    Tessellator.COLOR_CLEAR = Tessellator.vec4(0, 0, 0, 0);
    
    Tessellator.FLOAT32 = Tessellator.Constant.create("FLOAT");
    Tessellator.FLOAT16 = new Tessellator.Constant("HALF_FLOAT_OES", 0x8D61);

    Tessellator.DEFAULT_COLOR = Tessellator.COLOR_WHITE;
    Tessellator.NO_CLIP = new Float32Array([0, 0, 1, 1]);
    Tessellator.NO_MASK = Tessellator.COLOR_WHITE;
    
    Tessellator.DEFAULT_FAR_VIEW = 100;
    Tessellator.DEFAULT_NEAR_VIEW = 0.01;
    Tessellator.DEFAULT_FOV = Math.PI / 4;
    
    Tessellator.VERTEX_LIMIT = Math.pow(2, 16);
    
    Tessellator.COLORS = {
        "WHITE": Tessellator.COLOR_WHITE,
        "BLACK": Tessellator.COLOR_BLACK,
        "RED": Tessellator.COLOR_RED,
        "DARK RED": Tessellator.COLOR_DARK_RED,
        "GREEN": Tessellator.COLOR_GREEN,
        "BLUE": Tessellator.COLOR_BLUE,
        "GRAY": Tessellator.COLOR_GRAY,
        "LIGHT GRAY": Tessellator.COLOR_LIGHT_GRAY,
        "DARK GRAY": Tessellator.COLOR_DARK_GRAY,
        "YELLOW": Tessellator.COLOR_YELLOW,
        "CYAN": Tessellator.COLOR_CYAN,
        "MAGENTA": Tessellator.COLOR_MAGENTA,
        "BROWN": Tessellator.COLOR_BROWN,
        "NAVY": Tessellator.COLOR_NAVY,
        "MAROON": Tessellator.COLOR_MAROON,
        "FIRE BRICK": Tessellator.COLOR_FIRE_BRICK,
        "CRIMSON": Tessellator.COLOR_CRIMSON,
        "TOMATO": Tessellator.COLOR_TOMATO,
        "CORAL": Tessellator.COLOR_CORAL,
        "INDIAN RED": Tessellator.COLOR_INDIAN_RED,
        "PINK": Tessellator.COLOR_PINK,
        "LIGHT PINK": Tessellator.LIGHT_PINK,
        "PURPLE": Tessellator.COLOR_PURPLE,
        "INDIGO": Tessellator.COLOR_INDIGO,
        "VIOLET": Tessellator.COLOR_VIOLET,
        "AMBER": Tessellator.COLOR_AMBER,
        "CLEAR": Tessellator.COLOR_CLEAR,
    };
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Polygon = function (vertices){
    this.vertices = vertices;
}

Tessellator.Polygon.prototype.getNormal = function (){
    var normal = Tessellator.vec3();
    var poly = this.vertices;
    
    for (var i = 0; i < poly.length; i += 3){
        normal[0] += (poly[i + 1] - poly[(i + 4) % poly.length]) * (poly[i + 2] + poly[(i + 5) % poly.length]);
        normal[1] += (poly[i + 2] - poly[(i + 5) % poly.length]) * (poly[i + 0] + poly[(i + 3) % poly.length]);
        normal[2] += (poly[i + 0] - poly[(i + 3) % poly.length]) * (poly[i + 1] + poly[(i + 4) % poly.length]);
    }
    
    return normal.normalize();
}

Tessellator.Polygon.prototype.convert2D = function (normal){
    if (!normal){
        normal = this.getNormal();
    }
    
    var up = normal.clone().normalize();
    var right, backward;
    
    if (Math.abs(normal[0]) > Math.abs(normal[2])){
        right = up.cross(Tessellator.vec3(0, 0, 1));
    }else{
        right = up.cross(Tessellator.vec3(1, 0, 0));
    }
    right.normalize();
    backward = right.clone().cross(up);
    
    var mat = Tessellator.mat4(
        right[0], up[0], backward[0], 0,
        right[1], up[1], backward[1], 0,
        right[2], up[2], backward[2], 0,
        0, 0, 0, 1
    );
    
    var poly = this.vertices;
    var dPoly = new Float32Array(poly.length / 3 * 2);
    
    for (var i = 0; i < poly.length / 3; i++){
        var v = Tessellator.vec4(poly[i * 3], poly[i * 3 + 1], poly[i * 3 + 2], 1);
        v.multiply(mat);
        
        dPoly[i * 2] = v[0];
        dPoly[i * 2 + 1] = v[1];
    }
    
    this.vertices = dPoly;
}

Tessellator.Polygon.prototype.convertToTriangles = function (off){
    var poly = this.vertices;
    var points = poly.length / 2;
    
    off = off || 0;
    
    if (points <= 2){
        throw "not a complete polygon";
    }
    
    var indices = new Tessellator.Array(16);
    
    var avl = new Array(points);
    for (var i = 0; i < points; i++){
        avl[i] = i;
    }
    
    for (var i = 0; i < 3 * avl.length || avl.length >= 6; i++){
        var
            i0 = avl[(i + 0) % avl.length],
            i1 = avl[(i + 1) % avl.length],
            i2 = avl[(i + 2) % avl.length],
            
            ax = poly[i0 * 2],  ay = poly[i0 * 2 + 1],
            bx = poly[i1 * 2],  by = poly[i1 * 2 + 1],
            cx = poly[i2 * 2],  cy = poly[i2 * 2 + 1];
        
        if ((ay - by) * (cx - bx) + (bx - ax) * (cy - by) >= 0){
            for (var ii = 0; ii < avl.length; (ii === i - 1) ? ii += 3 : ii++){
                var
                    p = avl[ii],
                
                    v0x = cx              - ax,
                    v0y = cy              - ay,
                    v1x = bx              - ax,
                    v1y = by              - ay,
                    v2x = poly[p * 2 + 0] - ax,
                    v2y = poly[p * 2 + 1] - ay,
                
                    dot00 = v0x * v0x + v0y * v0y,
                    dot01 = v0x * v1x + v0y * v1y,
                    dot02 = v0x * v2x + v0y * v2y,
                    dot11 = v1x * v1x + v1y * v1y,
                    dot12 = v1x * v2x + v1y * v2y;
                
                var d = dot00 * dot11 - dot01 * dot01;
                var u = (dot11 * dot02 - dot01 * dot12) / d;
                var v = (dot00 * dot12 - dot01 * dot02) / d;
                
                if (u >= 0 && v >= 0 && u + v < 1){
                    break;
                }
            }
            
            indices.push(i0 + off, i1 + off, i2 + off);
            avl.splice((i + 1) % avl.length, 1);
            i = -1;
        }
    }
    
    indices.push(avl[0] + off, avl[1] + off, avl[2] + off);
    return indices;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createRenderLoop = function (){
    return Tessellator.new.apply(Tessellator.RenderLoop, arguments);
}

Tessellator.RenderLoop = function (){
    if (arguments.length === 1 && arguments[0].constructor === Tessellator.RenderLoop.Item){
        this.item = arguments[0];
    }else{
        this.item = null;
            
        if (arguments.length > 0){
            this.item = Tessellator.new.apply(Tessellator.RenderLoop.Item, arguments);
        }
    }
    
    this.animate = Tessellator.getVendorIndependent(window, "requestanimationframe");
    
    if (!this.animate){
        this.usingFallback = true;
        this.setFPS(60);
        
        this.animate = function (callback){
            callback();
        }
        
        console.warn("Using a fall back render loop. Rendering at 60fps");
    }
    
    var self = this;
    
    this.renderLoop = function (currTime){
        if (self.item){
            var time = self.item.render(currTime);
            
            if (time <= 0){
                self.animationFrame = self.animate.call(window, self.renderLoop);
                self.fpswait = undefined;
            }else{
                self.animationFrame = null;
                
                self.fpswait = window.setTimeout(function (){
                    self.fpswait = undefined;
                    self.animationFrame = self.animate.call(window, self.renderLoop);
                }, time);
            }
        }
    }
    
    this.start();
}

Tessellator.RenderLoop.prototype.stop = function (){
    if (this.fpswait !== undefined){
        window.clearTimeout(this.fpswait);
    }
    
    if (this.animationFrame !== undefined){
        if (!this.usingFallback) {
            Tessellator.getVendorIndependent(window, "cancelanimationframe")(this.animationFrame);
        }
        
        this.animationFrame = undefined;
    }
    
    this.item.fps = 0;
    this.item.averageFps = 0;
}

Tessellator.RenderLoop.prototype.start = function (){
    this.item.lastFrame = Date.now();
    this.item.expectedWait = 0;
    
    if (this.animationFrame === undefined){
        this.animationFrame = this.animate.call(window, this.renderLoop);
    }
}

Tessellator.RenderLoop.prototype.getFPS = function (){
    return this.item.fps;
}

Tessellator.RenderLoop.prototype.getAverageFPS = function (){
    return this.item.averageFps;
}

Tessellator.RenderLoop.prototype.setFPS = function (fps){
    if (this.usingFallback && !fps){
        throw "cannot unlock fps while fallback is being used!";
    }
    
    this.item.setFPS(fps);
}

Tessellator.RenderLoop.prototype.getRenderTime = function (){
    return this.item.renderTime;
}

Tessellator.RenderLoop.prototype.setRenderer = function (renderer){
    this.item.renderer = renderer;
}

Tessellator.RenderLoop.prototype.renderArg = function (arg){
    this.item.setRenderArg(arg);
}

Tessellator.RenderLoop.Item = function (renderer, renderArg){
    this.frames = 0;
    this.avSample = Tessellator.vec3();
    
    this.lastFrame = Date.now();
    this.expectedWait = 0;
    
    this.fps = 0;
    this.averageFps = 0;
    this.savedTime = 0;
    
    this.renderer = arguments[0];
    this.renderArg = arguments[1];
}

Tessellator.RenderLoop.Item.prototype.setFPS = function (fps){
    this.savedTime = 0;
    this.maxFPS = fps && !isNaN(fps) ? Tessellator.float(fps) : fps;
}

Tessellator.RenderLoop.Item.prototype.setRenderArg = function (arg){
    this.renderArg = arg;
}

Tessellator.RenderLoop.Item.prototype.render = function (){
    var time = Date.now();
    var ta = time - this.lastFrame;
    this.lastFrame = time;
    
    this.fps = 1000 / ta || 0;
    this.frames++;
    
    if (this.avSample[1] >= 32){
        this.avSample[2] = this.avSample[0] / 32;
        this.avSample[0] = 0;
        this.avSample[1] = 0;
    }
    
    this.avSample[0] += this.fps;
    var det = ++this.avSample[1] / 32;
    this.averageFps = this.avSample[0] / this.avSample[1] * det + (1-det) * this.avSample[2];
    
    this.renderer.render(null, this.renderArg);
    
    if (this.maxFPS){
        this.savedTime += 1000 / this.maxFPS.x() + this.expectedWait - ta;
        
        var comp = Math.max(0, Math.round(this.savedTime));
        
        this.savedTime -= comp;
        
        this.expectedWait = comp;
        return comp;
    }else{
        return 0;
    }
}/**
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


//strict mode can be used with this.
"use strict";

(function () {
    var Factory = function (constructor, args) {
        return constructor.apply(this, args);
    }


    Tessellator.new = function() {
        Factory.prototype = this.prototype;
        return new Factory(this, arguments);
    }
    
    Tessellator.extend = function (o, o2){
        var newproto = Object.create(o2.prototype);
        
        newproto.super = function (){
            this.super = o2.prototype.super;
            o2.apply(this, arguments);
            
            var instance = {};
            var self = this;
            var level = o2.prototype;
            
            for (var oo in o2.prototype){
                (function (obj){
                    instance[obj] = function (){
                        var cache = level;
                        level = cache.__proto__;
                        
                        var value = cache[obj].apply(self, arguments);
                        level = cache;
                        
                        return value;
                    }
                })(oo);
            }
            
            this.super = instance;
        }
        
        newproto.constructor = o;
        
        o.prototype = newproto;
    }
})();

Tessellator.copyProto = Tessellator.extend;

Tessellator.prototype.glConst = function (c){
    if (c.constructor === Array){
        for (var i = 0; i < c.length; i++){
            c[i] = this.glConst(c[i]);
        }
        
        return c;
    }else if (c.constructor === Tessellator.Constant){
        return c.gl;
    }else{
        return c;
    }
}

Tessellator.prototype.tessConst = function (c){
    return Tessellator.Constant.VALUE_NAME[c];
}

Tessellator.Extensions = function (tessellator){
    this.extensions = {};
    this.tessellator = tessellator;
    
    var avaliable = tessellator.GL.getSupportedExtensions();
    
    for (var i = 0; i < avaliable.length; i++){
        this.extensions[avaliable[i]] = undefined;
    }
}

Tessellator.Extensions.prototype.get = function (key){
    var c = this.extensions[key];
    
    if (c === undefined){
        for (var i = 0; i < Tessellator.VENDORS.length && !c; i++){
            c = this.tessellator.GL.getExtension(Tessellator.VENDORS[i] + key);
        }
        
        if (!c){
            c = undefined;
        }
        
        this.extensions[key] = c;
    }
    
    return c;
}

Tessellator.EMPTY_FUNC = function () {}

Tessellator.getSourceText = function(elem, notify){
    if (!elem){
        return;
    }
    
    if (elem.getAttribute("src")){
        return Tessellator.getRemoteText(elem.getAttribute("src"), notify);
    }else{
        var code = [];
        
        for (var i = 0; i < elem.childNodes.length; i++){
            if (elem.childNodes[i].nodeType === elem.childNodes[i].TEXT_NODE){
                code.push(elem.childNodes[i].textContent);
            }
        }
        
        if (notify){
            notify(code.join(""));
        }else{
            return code.join("");
        }
    }
}

Tessellator.getRemoteText = function(src, notify){
    if (!src){
        return;
    }
    
    var request = new XMLHttpRequest();
    
    if (notify){
        request.open("GET", src, true);
        
        request.onreadystatechange = function () {
            if (request.readyState === 4){
                if (request.status < 200 || request.status >= 300){
                    console.error("Unable to load resource: " + src + ", server responded with: " + request.status + " (" + request.statusText + ")");
                }else{
                    notify(request.responseText);
                }
            }
        }
        
        request.send();
    }else{
        request.open("GET", src, false);
        request.send();
        
        return request.responseText;
    }
}

Tessellator.getFirstDomFromType = function (dom, type){
    for (var i = 0, k = dom.childNodes.length; i < k; i++){
        if (type.constructor === Array){
            for (var ii = 0, kk = type.length; ii < kk; ii++){
                if (dom.childNodes[i].type === type[ii]){
                    return dom.childNodes[i];
                }
            }
        }else if (dom.childNodes[i].type === type){
            return dom.childNodes[i];
        }
    }
}

Tessellator.getColor = function (data){
    var color;
    
    if (data.length === 0){
        color = Tessellator.vec4();
    }else if (data.length === 4){
        color = Tessellator.vec4(data[0], data[1], data[2], data[3]);
    }else if (data.length === 3){
        color = Tessellator.vec4(data[0], data[1], data[2], 1);
    }else if (data.length === 2){
        color = Tessellator.vec4(data[0], data[0], data[0], data[1]);
    }else if (data.length === 1){
        var arg = data[0];
        
        if (!isNaN(arg)){
            var red = ((arg >> 16) & 0xFF) / 255;
            var green = ((arg >> 8) & 0xFF) / 255;
            var blue = ((arg >> 0) & 0xFF) / 255;
            
            color = Tessellator.vec4(red, green, blue, 1);
        }else if (arg.constructor === Tessellator.vec4){
            color = arg;
        }else if (arg.constructor === Tessellator.vec3){
            color = Tessellator.vec4(arg, 1);
        }else if (arg.constructor === Tessellator.float){
            color = Tessellator.vec4(arg, arg, arg, 1);
        }else if (arg.constructor === Array){
            if (arg.length === 4){
                color = Tessellator.vec4(arg);
            }else if (arg.length === 3){
                color = Tessellator.vec4(arg, 1);
            }else if (arg.length === 2){
                color = Tessellator.vec4(arg[0], arg[0], arg[0], arg[1]);
            }else if (arg.length === 1){
                color = Tessellator.vec4(arg, arg, arg, 1);
            }else{
                color = Tessellator.vec4();
            }
        }else if (arg.length === 9 && arg.chatAt(0) === '#'){
            var red = parseInt(arg.substring(1, 3), 16) / 256;
            var green = parseInt(arg.substring(3, 5), 16) / 256;
            var blue = parseInt(arg.substring(5, 7), 16) / 256;
            var alpha = parseInt(arg.substring(7, 9), 16) / 256;
            
            color = Tessellator.vec4(red, green, blue, alpha);
        }else if (arg.length === 7 && arg.charAt(0) === '#'){
            var red = parseInt(arg.substring(1, 3), 16) / 256;
            var green = parseInt(arg.substring(3, 5), 16) / 256;
            var blue = parseInt(arg.substring(5, 7), 16) / 256;
            
            color = Tessellator.vec4(red, green, blue, 1);
        }else if (arg.length === 4 && arg.charAt(0) === '#'){
            var red = parseInt(arg.substring(1, 2), 16) / 16;
            var green = parseInt(arg.substring(2, 3), 16) / 16;
            var blue = parseInt(arg.substring(3, 4), 16) / 16;
            
            color = Tessellator.vec4(red, green, blue, 1);
        }else if (arg.length === 5 && arg.charAt(0) === '#'){
            var red = parseInt(arg.substring(1, 2), 16) / 16;
            var green = parseInt(arg.substring(2, 3), 16) / 16;
            var blue = parseInt(arg.substring(3, 4), 16) / 16;
            var alpha = parseInt(arg.substring(4, 5), 16) / 16;
            
            color = Tessellator.vec4(red, green, blue, alpha);
        }else{
            color = Tessellator.COLORS[arg.toUpperCase()];
        }
    }else{
        throw "too many arguments: " + data.length;
    }
    
    return color;
}

Tessellator.prototype.create3DTextureModel = function (texture, width, height, depth){
    var model = this.createModel();
    
    var builder = function(){
        model.bindTexture(texture);
        model.depthMask(0);
        
        model.start(Tessellator.TEXTURE);
        model.setVertex(
            0, 0,
            1, 0,
            1, 1,
            0, 1,
            
            1, 0,
            0, 0,
            0, 1,
            1, 1
        );
        
        for (var x = 0; x < texture.width; x++){
            var c = x / texture.width;
            
            model.setVertex([
                c, 0,
                c - 1 / texture.width, 0,
                c - 1 / texture.width, 1,
                c, 1,
                
                c, 0,
                c + 1 / texture.width, 0,
                c + 1 / texture.width, 1,
                c, 1
            ]);
        }
        
        for (var y = 0; y < texture.height; y++){
            var c = y / texture.height;
            
            model.setVertex([
                0, c,
                0, c - 1 / texture.width,
                1, c - 1 / texture.width,
                1, c,
                
                0, c,
                0, c + 1 / texture.width,
                1, c + 1 / texture.width,
                1, c
            ]);
        }
        
        model.end();
        model.start(Tessellator.QUAD);
        model.setVertex(
            0, 0, 0,
            width, 0, 0,
            width, height, 0,
            0, height, 0,
            
            width, 0, -depth,
            0, 0, -depth,
            0, height, -depth,
            width, height, -depth
        );
        
        for (var x = 0; x < texture.width; x++){
            var c = x / texture.width * width;
            
            model.setVertex(
                c, 0, 0,
                c, 0, -depth,
                c, height, -depth,
                c, height, 0,
                
                c, 0, -depth,
                c, 0, 0,
                c, height, 0,
                c, height, -depth
            );
        }
        
        for (var y = 0; y < texture.height; y++){
            var c = y / texture.height * height;
            
            model.setVertex(
                0, c, -depth,
                0, c, 0,
                width, c, 0,
                width, c, -depth,
                
                0, c, 0,
                0, c, -depth,
                width, c, -depth,
                width, c, 0
            );
        }
        
        model.end();
        model.finish();
    }
    
    texture.addListener(builder);
    
    return model;
}

Tessellator.getVendorIndependent = function (object, name){
    for (var o in object){
        var oo = o.toLowerCase();
        
        for (var i = 0; i < Tessellator.VENDORS.length; i++){
            if (oo == Tessellator.VENDORS[i] + name){
                return object[o];
            }
        }
    }
}

Tessellator.prototype.getPointerLock = function (){
    return Tessellator.getVendorIndependent(document, "pointerlockelement");
}

Tessellator.prototype.hasPointerLock = function (){
    return this.pointerLock;
}

Tessellator.prototype.aquirePointerLock = function (){
    if (this.getPointerLock() !== this.canvas){
        Tessellator.getVendorIndependent(this.canvas, "requestpointerlock").call(this.canvas);
        
        this.pointerLock = {
            event: (function (tessellator) {
                return function (e){
                    if (!e || tessellator.getPointerLock() !== tessellator.canvas){
                        document.removeEventListener("pointerlockchange", tessellator.pointerLock.event);
                        document.removeEventListener("mozpointerlockchange", tessellator.pointerLock.event);
                        document.removeEventListener("webkitpointerlockchange", tessellator.pointerLock.event);
                        
                        Tessellator.getVendorIndependent(document, "exitpointerlock").call(document);
                        
                        tessellator.pointerLock = null;
                    }
                }
            })(this),
        }
        
        document.addEventListener("pointerlockchange", this.pointerLock.event);
        document.addEventListener("mozpointerlockchange", this.pointerLock.event);
        document.addEventListener("webkitpointerlockchange", this.pointerLock.event);
    }
}

Tessellator.prototype.releasePointerLock = function (){
    if (this.pointerLock){
        this.pointerLock.event();
    }
}

Tessellator.prototype.requestFullscreen = function (){
    if (Tessellator.getVendorIndependent(document, "fullscreenelement") !== tessellator.canvas){
        Tessellator.getVendorIndependent(this.canvas, "requestfullscreen").call(this.canvas);
        
        this.fullscreen = {
            style: this.canvas.style.cssText,
            event: (function (tessellator){
                return function (e){
                    if (!e || Tessellator.getVendorIndependent(document, "fullscreenelement") !== tessellator.canvas){
                        tessellator.canvas.style.cssText = tessellator.fullscreen.style;
                        tessellator.forceCanvasResize();
                        
                        tessellator.canvas.removeEventListener("fullscreenchange", tessellator.fullscreen.event);
                        tessellator.canvas.removeEventListener("webkitfullscreenchange", tessellator.fullscreen.event);
                        tessellator.canvas.removeEventListener("mozfullscreenchange", tessellator.fullscreen.event);
                        
                        Tessellator.getVendorIndependent(document, "exitfullscreen").call(document);
                        
                        tessellator.fullscreen = null;
                    }
                }
            })(this),
        }
        
        this.canvas.style.cssText = "width:100%;height:100%;display:block;top:0px;left:0px;";
        
        this.forceCanvasResize();
        
        this.canvas.addEventListener("fullscreenchange", this.fullscreen.event);
        this.canvas.addEventListener("webkitfullscreenchange", this.fullscreen.event);
        this.canvas.addEventListener("mozfullscreenchange", this.fullscreen.event);
    }
}

Tessellator.prototype.isFullscreen = function (){
    return this.fullscreen;
}

Tessellator.prototype.exitFullscreen = function (){
    if (this.fullscreen){
        this.fullscreen.event();
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createModelFromObj = function (text, obj){
    if (!text){
        throw "obj model must be given";
    }
    
    var v = new Tessellator.Array();
    var vt = new Tessellator.Array();
    var vn = new Tessellator.Array();
    var vert = new Tessellator.Array();
    var tex = new Tessellator.Array();
    var norm = new Tessellator.Array();
    
    var pos = -1;
    var nextLine;
    
    var unse = 0;
    
    if (!obj){
        obj = new Tessellator.Object(this, Tessellator.TRIANGLE);
    }
    
    do{
        nextLine = text.indexOf("\n", ++pos)
        
        if (nextLine < 0){
            nextLine = text.length;
        }
        
        var s = text.indexOf(" ", pos);
        var type = text.substring(pos, s++).trim();
        
        if (type == "v"){
            var oldPos = s;
            
            while (true){
                if (s >= nextLine){
                    break;
                }else{
                    oldPos = s;
                }
                
                s = Math.min(nextLine, text.indexOf(" ", s));
                
                if (s === -1){
                    s = text.length;
                }
                
                var vv = text.substring(oldPos, s).trim();
                if (vv.length) v.push(parseFloat(vv));
                
                s++;
            }
        }else if (type == "vn"){
            var oldPos = s;
            
            while (true){
                if (s >= nextLine){
                    break;
                }else{
                    oldPos = s;
                }
                
                s = Math.min(nextLine, text.indexOf(" ", s));
                
                if (s === -1){
                    s = text.length;
                }
                
                var vv = text.substring(oldPos, s).trim();
                if (vv.length) vn.push(parseFloat(vv));
                
                s++;
            }
        }else if (type == "vt"){
            var oldPos = s;
            
            while (true){
                if (s >= nextLine){
                    break;
                }else{
                    oldPos = s;
                }
                
                s = Math.min(nextLine, text.indexOf(" ", s));
                
                if (s === -1){
                    s = text.length;
                }
                
                var vv = text.substring(oldPos, s).trim();
                if (vv.length) vt.push(parseFloat(vv));
                
                s++;
            }
        }else if (type == "f"){
            var oldPos = s;
            
            var av = new Tessellator.Array(16);
            
            while (true){
                if (s >= nextLine){
                    break;
                }else{
                    oldPos = s;
                }
                
                s = Math.min(nextLine, text.indexOf(" ", s));
                
                if (s === -1){
                    s = text.length;
                }
                
                var l = text.substring(oldPos, s).split("/");
                
                if (l.length === 3){
                    if (l[1].length){
                        var i1 = parseInt(l[0]) - 1;
                        var i2 = parseInt(l[1]) - 1;
                        var i3 = parseInt(l[2]) - 1;
                        
                        av.push(v.get(i1 * 3), v.get(i1 * 3 + 1), v.get(i1 * 3 + 2));
                        tex.push(vt.get(i2 * 2), vt.get(i2 * 2 + 1));
                        norm.push(vn.get(i3 * 3), vn.get(i3 * 3 + 1), vn.get(i3 * 3 + 2));
                    }else{
                        var i1 = parseInt(l[0]) - 1;
                        var i3 = parseInt(l[2]) - 1;
                        
                        av.push(v.get(i1 * 3), v.get(i1 * 3 + 1), v.get(i1 * 3 + 2));
                        norm.push(vn.get(i3 * 3), vn.get(i3 * 3 + 1), vn.get(i3 * 3 + 2));
                    }
                }else if (l.length === 2){
                    var i1 = parseInt(l[0]) - 1;
                    var i2 = parseInt(l[1]) - 1;
                    
                    av.push(v.get(i1 * 3), v.get(i1 * 3 + 1), v.get(i1 * 3 + 2));
                    tex.push(vt.get(i2 * 2), vt.get(i2 * 2 + 1));
                }else if (length === 1){
                    var i1 = parseInt(l[0]) - 1;
                    
                    av.push(v.get(i1 * 3), v.get(i1 * 3 + 1), v.get(i1 * 3 + 2));
                }
                
                s++;
            }
            
            if (av.length){
                var tri = new Tessellator.Polygon(av.combine());
                tri.convert2D();
                obj.getIndices().push(tri.convertToTriangles(vert.length / 3));
                vert.push(av);
            }
        }
    }while ((pos = nextLine) < text.length);
    
    obj.setAttribute("position", Tessellator.VEC3, vert, Float32Array);
    obj.setAttribute("color", Tessellator.VEC2, tex, Float32Array);
    obj.setAttribute("normal", Tessellator.VEC3, norm, Float32Array);
    obj.upload();
    
    return obj;
}

Tessellator.prototype.loadObjModel = function (url, obj){
    if (!obj){
        obj = new Tessellator.Object(this, Tessellator.TRIANGLE);
    }
    
    var self = this;
    
    Tessellator.getRemoteText(url, function (text){
        self.createModelFromObj(text, obj);
    });
    
    return obj;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createModelFromJSON = function (json, obj){
    if (!json){
        throw "json model must be given";
    }
    
    if (!obj){
        obj = new Tessellator.Object(this, Tessellator.TRIANGLE);
    }
    
    obj.setAttribute("position", Tessellator.VEC3, new Tessellator.Array(json.vertexPositions), Float32Array);
    obj.setAttribute("color", Tessellator.VEC2, new Tessellator.Array(json.vertexTextureCoords), Float32Array);
    obj.setAttribute("normal", Tessellator.VEC3, new Tessellator.Array(json.vertexNormals), Float32Array);
    obj.getIndices().push(json.indices);
    
    obj.upload();
    
    return obj;
}

Tessellator.prototype.loadJSONModel = function (url, obj){
    if (!obj){
        obj = new Tessellator.Object(this, Tessellator.TRIANGLE);
    }
    
    var self = this;
    
    Tessellator.getRemoteText(url, function (text){
        self.createModelFromJSON(JSON.parse(text), obj);
    });
    
    return obj;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Texture = function (tessellator){
    this.setTessellator(tessellator);
    this.disposable = false;
    this.disposed = false;
    this.ready = false;
    this.updateRequested = false;
    
    this.tracking = [];
    
    this.type = Tessellator.TEXTURE_2D;
    
    this.width = -1;
    this.height = -1;
}

Tessellator.Texture.prototype.setTessellator = function (tess){
    if (tess && !this.tessellator){
        this.tessellator = tess;
        
        this.tessellator.resources.push(this);
    }
}

Tessellator.Texture.prototype.track = function (obj){
    if (!this.isTracking(obj)){
        this.tracking.push(obj);
        
        return true;
    }
    
    return false;
}

Tessellator.Texture.prototype.isTracking = function (obj){
    for (var i = 0; i < this.tracking.length; i++){
        if (this.tracking[i] === obj){
            return true;
        }
    }
    
    return false;
}

Tessellator.Texture.prototype.untrack = function (obj){
    for (var i = 0; i < this.tracking.length; i++){
        if (this.tracking[i] === obj){
            this.tracking.splice(i, i + 1);
            
            return true;
        }
    }
    
    return false;
}

Tessellator.Texture.prototype.clearTracking = function (){
    this.tracking.splice(0, this.tracking.length);
}

Tessellator.Texture.prototype.getAspect = function (){
    return this.isReady() ? this.width / this.height : undefined;
}

Tessellator.Texture.prototype.addListener = function (func){
    if (!this.isReady()){
        if (this.listeners){
            this.listeners.push(func);
        }else{
            this.listeners = [ func ];
        }
    }else{
        func(this);
    }
}

Tessellator.Texture.prototype.isReady = function (){
    return this.ready && !this.disposed;
}

Tessellator.Texture.prototype.setReady = function (){
    if (!this.isReady()){
        this.ready = true;
        this.disposed = false;
        
        if (this.listeners){
            for (var i = 0; i < this.listeners.length; i++){
                this.listeners[i](this);
            }
            
            this.listeners = null;
        }
        
        if (this.tessellator && this.tessellator.onTextureLoaded){
            this.tessellator.onTextureLoaded(this);
        }
    }
}

Tessellator.Texture.prototype.setDisposable = function (disposable){
    this.disposable = disposable;
    
    return this;
}

Tessellator.Texture.prototype.dispose = function (){
    if (this.texture){
        this.tessellator.GL.deleteTexture(this.texture);
        
        this.tessellator.resources.remove(this);
        this.disposed = true;
        this.texture = null;
    }
}

Tessellator.Texture.prototype.bind = function (){
    this.tessellator.GL.bindTexture(this.tessellator.glConst(this.type), this.isReady() ? this.texture : null);
}

Tessellator.Texture.prototype.update = function (){
    this.clearTracking();
}

Tessellator.TEXTURE_FILTER_NEAREST = function TEXTURE_FILTER_NEAREST (tessellator, texture){
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_MAG_FILTER, tessellator.GL.NEAREST);
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_MIN_FILTER, tessellator.GL.NEAREST);
}

Tessellator.TEXTURE_FILTER_LINEAR = function TEXTURE_FILTER_LINEAR (tessellator, texture){
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_MAG_FILTER, tessellator.GL.LINEAR);
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_MIN_FILTER, tessellator.GL.LINEAR);
}

Tessellator.TEXTURE_FILTER_MIPMAP_NEAREST = function TEXTURE_FILTER_MIPMAP_NEAREST (tessellator, texture){
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_MAG_FILTER, tessellator.GL.NEAREST);
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_MIN_FILTER, tessellator.GL.LINEAR_MIPMAP_NEAREST);
    tessellator.GL.generateMipmap(tessellator.glConst(texture.type));
}

Tessellator.TEXTURE_FILTER_MIPMAP_LINEAR = function TEXTURE_FILTER_MIPMAP_LINEAR (tessellator, texture){
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_MAG_FILTER, tessellator.GL.LINEAR);
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_MIN_FILTER, tessellator.GL.LINEAR_MIPMAP_NEAREST);
    tessellator.GL.generateMipmap(tessellator.glConst(texture.type));
}

Tessellator.TEXTURE_FILTER_LINEAR_CLAMP = function TEXTURE_FILTER_LINEAR_CLAMP (tessellator, texture){
    Tessellator.TEXTURE_FILTER_LINEAR(tessellator, texture);
    
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_WRAP_S, tessellator.GL.CLAMP_TO_EDGE);
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_WRAP_T, tessellator.GL.CLAMP_TO_EDGE);
}

Tessellator.TEXTURE_FILTER_NEAREST_CLAMP = function TEXTURE_FILTER_NEAREST_CLAMP (tessellator, texture){
    Tessellator.TEXTURE_FILTER_NEAREST(tessellator, texture);
    
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_WRAP_S, tessellator.GL.CLAMP_TO_EDGE);
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_WRAP_T, tessellator.GL.CLAMP_TO_EDGE);
}

Tessellator.TEXTURE_FILTER_LINEAR_REPEAT = function TEXTURE_FILTER_LINEAR_REPEAT (tessellator, texture){
    Tessellator.TEXTURE_FILTER_LINEAR(tessellator, texture);
    
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_WRAP_S, tessellator.GL.REPEAT);
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_WRAP_T, tessellator.GL.REPEAT);
}

Tessellator.TEXTURE_FILTER_NEAREST_REPEAT = function TEXTURE_FILTER_NEAREST_REPEAT (tessellator, texture){
    Tessellator.TEXTURE_FILTER_NEAREST(tessellator, texture);
    
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_WRAP_S, tessellator.GL.REPEAT);
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), tessellator.GL.TEXTURE_WRAP_T, tessellator.GL.REPEAT);
}

Tessellator.TEXTURE_FILTER_NEAREST_ANISOTROPY = function (tessellator, texture){
    var f = tessellator.extensions.get("EXT_texture_filter_anisotropic");
    
    if (!f){
        throw "anisotropic filtering not supported";
    }
    
    Tessellator.TEXTURE_FILTER_NEAREST(tessellator, texture);
    
    var max = tessellator.GL.getParameter(f.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), f.TEXTURE_MAX_ANISOTROPY_EXT, max);
}

Tessellator.TEXTURE_FILTER_LINEAR_ANISOTROPY = function (tessellator, texture){
    var f = tessellator.extensions.get("EXT_texture_filter_anisotropic");
    
    if (!f){
        throw "anisotropic filtering not supported";
    }
    
    Tessellator.TEXTURE_FILTER_LINEAR(tessellator, texture);
    
    var max = tessellator.GL.getParameter(f.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), f.TEXTURE_MAX_ANISOTROPY_EXT, max);
}

Tessellator.TEXTURE_FILTER_NEAREST_ANISOTROPY = function (tessellator, texture){
    var f = tessellator.extensions.get("EXT_texture_filter_anisotropic");
    
    if (!f){
        throw "anisotropic filtering not supported";
    }
    
    Tessellator.TEXTURE_FILTER_NEAREST(tessellator, texture);
    
    var max = tessellator.GL.getParameter(f.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    tessellator.GL.texParameteri(tessellator.glConst(texture.type), f.TEXTURE_MAX_ANISOTROPY_EXT, max);
}

Tessellator.DEFAULT_TEXTURE_FILTER = Tessellator.TEXTURE_FILTER_NEAREST;
Tessellator.DEFAULT_CLAMP_TEXTURE_FILTER = Tessellator.TEXTURE_FILTER_NEAREST_CLAMP;

Tessellator.getAppropriateTextureFilter = function (width, height){
    if (width && height && (width & (width - 1)) === 0 && (height & (height - 1)) === 0){
        return Tessellator.DEFAULT_TEXTURE_FILTER;
    }else{
        return Tessellator.DEFAULT_CLAMP_TEXTURE_FILTER;
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.loadTexture = function (src, filter){
    return new Tessellator.TextureImage(this, src, filter);
}

Tessellator.prototype.createTexture = Tessellator.prototype.loadTexture;

Tessellator.prototype.getTexture = function (src){
    var texture;
    
    if (this.textureCache[src]){
        texture = this.textureCache[src];
    }else{
        texture = this.createTexture(src);
        
        this.textureCache[src] = texture;
    }
    
    return texture;
}

Tessellator.TextureImage = function (tessellator, src, filter){
    this.super (tessellator);
    this.filter = filter;
    this.autoUpdate = false;
    
    if (src){
        if (src.constructor === String){
            var self = this;
            
            Tessellator.TextureImage.loadImage(src, function (image){
                self.image = image;
                
                self.width = self.image.width;
                self.height = self.image.height;
                
                if (!self.filter){
                    self.filter = Tessellator.getAppropriateTextureFilter(self.width, self.height);
                }
                
                self.setReady();
            });
        }else if (src.tagName && src.tagName.toLowerCase() == "img"){
            if (src.loaded){
                this.image = src;
                this.width = this.image.width;
                this.height = this.image.height;
                
                if (!this.filter){
                    this.filter = Tessellator.getAppropriateTextureFilter(this.image.width, this.image.height);
                }
                
                this.setReady();
            }else{
                this.image = src;
                var self = this;
                
                this.image.listeners.push(function (){
                    self.width = self.image.width;
                    self.height = self.image.height;
                    
                    if (!self.filter){
                        self.filter = Tessellator.getAppropriateTextureFilter(self.width, self.height);
                    }
                    
                    self.setReady();
                });
            }
        }else{
            this.image = src;
            this.width = this.image.width;
            this.height = this.image.height;
            
            if (!this.filter){
                this.filter = Tessellator.getAppropriateTextureFilter(this.width, this.height);
            }
            
            this.setReady();
        }
    }
}

Tessellator.copyProto(Tessellator.TextureImage, Tessellator.Texture);

Tessellator.TextureImage.prototype.configure = function (target, track){
    var gl = this.tessellator.GL;
    
    if (this.isReady()){
        if (!track || track.constructor === Tessellator.RenderMatrix){
            track = null;
            
            if (this.autoUpdate || !this.isTracking(track)){
                if (!this.texture){
                    gl.bindTexture(gl.TEXTURE_2D, this.texture = gl.createTexture());
                }else{
                    gl.bindTexture(gl.TEXTURE_2D, this.texture);
                }
                
                this.filter(this.tessellator, this);
            }
        }
        
        if (this.autoUpdate || !this.isTracking(track)){
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
            gl.texImage2D(this.tessellator.glConst(target), 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
            
            this.track(track);
            return true;
        }
    }
    
    return false;
}

Tessellator.TextureImage.imageCache = [];

Tessellator.TextureImage.imageCache.find = function (name){
    for (var i = 0; i < this.length; i++){
        if (this[i].src == name){
            return this[i]
        }
    }
}

Tessellator.TextureImage.loadImage = function (src, onLoad){
    var image = Tessellator.TextureImage.imageCache.find(src);
    
    if (image){
        if (onLoad){
            if (!image.loaded){
                image.listeners.push(onLoad);
            }else{
                onLoad(image);
            }
        }
    }else{
        if (Tessellator.TextureImage.imageCache.length >= 16){
            Tessellator.TextureImage.imageCache.splice(0, 1);
        }
        
        image = document.createElement("img");
        image.loaded = false;
        
        if (onLoad){
            image.listeners = [
                onLoad
            ];
        }else{
            image.listeners = [];
        }
        
        image.onload = function (){
            this.loaded = true;
            Tessellator.TextureImage.lengthLoaded++;
            
            for (var i = 0, k = this.listeners.length; i < k; i++){
                this.listeners[i](this);
            }
            
            delete this.listeners;
        }
        
        image.crossOrigin='';
        image.src = src;
        
        Tessellator.TextureImage.imageCache[src] = image;
    }
    
    return image;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createTextureQueue = function (){
    return Tessellator.new.apply(Tessellator.TextureQueue, arguments);
}

Tessellator.TextureQueue = function (){
    this.textures = Array.prototype.slice.call(arguments);
    
    this.textureIndex = 0;
    this.texture = this.textures[this.textureIndex];
    
    this.loaded = true;
}

Tessellator.TextureQueue.prototype.frame = function (frame){
    this.textureIndex = frame;
    this.texture = this.textures[frame];
    
    this.loaded = this.texture.loaded;
    
    if (!this.texture.isReady()){
        var self = this;
        
        this.texture.addListener(function (tex){
            self.texture = tex;
        });
        
        self.texture = new Tessellator.TextureDummy();
    }
}

Tessellator.TextureQueue.prototype.nextTexture = function (){
    if (this.textureIndex = this.textures.length - 1){
        this.textureIndex = 0;
        this.texture = this.textures[0];
    }else{
        this.texture = this.textures[++this.textureIndex];
    }
}

Tessellator.TextureQueue.prototype.play = function (frequency){
    var self = this;
    
    this.interval = window.setInterval(function (){
        self.nextTexture();
    }, frequency);
}

Tessellator.TextureQueue.prototype.stop = function (){
    if (this.interval){
        window.clearInterval(this.interval);
        
        delete this.interval;
    }
}

Tessellator.TextureQueue.prototype.configure = function (target, track){
    this.texture.configure(target, track);
}

Tessellator.TextureQueue.prototype.bind = function (render){
    this.texture.bind(render);
}

Tessellator.TextureQueue.prototype.dispose = function (){
    this.stop();
    
    for (var i = 0, k = this.textures.length; i < k; i++){
        this.textures[i].dispose();
    }
    
    this.tessellator.resources.remove(this);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createVideoTexture = function (src, filter, autoPlay){
    return new Tessellator.TextureVideo(this, src, filter, autoPlay);
}

Tessellator.prototype.loadVideoTexture = Tessellator.prototype.createVideoTexture;

Tessellator.TextureVideo = function (tessellator, src, filter, autoPlay){
    this.super(tessellator);
    
    this.location = src;
    
    this.filter = filter;
    this.index = 0;
    this.timeUpdate = null;
    this.autoPlay = autoPlay === undefined ? true : autoPlay;
    this.paused = null;
    this.volumeLevel = null;
    this.autoUpdate = true;
    
    if (src.constructor === String){
        var self = this;
        
        this.video = document.createElement("video");
        
        this.video.src = src;
        this.video.load();
        
        this.video.addEventListener("canplay", function (){
            self.width = self.video.videoWidth;
            self.height = self.video.videoHeight;
            
            if (!self.filter){
                self.filter = Tessellator.getAppropriateTextureFilter(self.width, self.height);
            }
            
            self.setReady();
        });
    }else if (src && src.tagName.toLowerCase() == "video"){
        this.video = src;
        
        this.video.addEventListener("canplay", function (){
            self.width = self.video.videoWidth;
            self.height = self.video.videoHeight;
            
            if (!self.filter){
                self.filter = Tessellator.getAppropriateTextureFilter(self.width, self.height);
            }
            
            self.setReady();
        });
    }else if (src && src.tagName.toLowerCase() == "canvas"){
        this.video = src;
        this.width = this.video.width;
        this.height = this.video.height;
        
        if (!this.filter){
            this.filter = Tessellator.getAppropriateTextureFilter(this.width, this.height);
        }
        
        this.setReady();
    }else if (src){
        this.video = src;
        this.width = this.video.videoWidth;
        this.height = this.video.videoHeight;
        
        if (!this.filter){
            this.filter = Tessellator.getAppropriateTextureFilter(this.width, this.height);
        }
        
        this.setReady();
    }
}

Tessellator.copyProto(Tessellator.TextureVideo, Tessellator.Texture);

Tessellator.TextureVideo.prototype.setReady = function (){
    this.super.setReady();
    
    if (this.autoPlay){
        this.looping(true);
        
        if (!this.volumeLevel){
            this.mute();
        }
        
        if (this.paused === null){
            this.play();
        }
    }
}

Tessellator.TextureVideo.prototype.play = function (){
    this.paused = false;
    
    if (this.isReady()){
        this.video.play();
    }
}

Tessellator.TextureVideo.prototype.pause = function (){
    this.paused = true;
    
    if (this.isReady()){
        this.video.pause();
    }
}

Tessellator.TextureVideo.prototype.toogle = function (){
    if (this.paused){
        this.play();
    }else{
        this.pause();
    }
}

Tessellator.TextureVideo.prototype.loop = function (){
    return this.video.loop;
}

Tessellator.TextureVideo.prototype.looping = function (loop){
    this.video.loop = loop;
}

Tessellator.TextureVideo.prototype.mute = function (){
    this.video.volume = 0;
}

Tessellator.TextureVideo.prototype.volume = function (level){
    this.volumeLevel = level;
    this.unmute();
}

Tessellator.TextureVideo.prototype.unmute = function (){
    if (!this.volumeLevel){
        this.volumeLevel = 1;
    }
    
    this.video.volume = this.volumeLevel;
}

Tessellator.TextureVideo.prototype.configure = function (target, track){
    var gl = this.tessellator.GL;
    
    if (this.isReady()){
        if (!track || track.constructor === Tessellator.RenderMatrix){
            track = null;
            
            if (this.autoUpdate || !this.isTracking(track)){
                if (!this.texture){
                    gl.bindTexture(gl.TEXTURE_2D, this.texture = gl.createTexture());
                    this.filter(this.tessellator, this);
                }else{
                    gl.bindTexture(gl.TEXTURE_2D, this.texture);
                }
            }
        }
        
        if (this.autoUpdate || !this.isTracking(track)){
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
            gl.texImage2D(this.tessellator.glConst(target), 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
            
            this.track(track);
            return true;
        }
    }
    
    return false;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createTextureCubeMap = function (filter){
    return new Tessellator.TextureCubeMap(this, filter);
}

Tessellator.TextureCubeMap = function (tessellator, filter){
    this.super(tessellator);
    
    this.type = Tessellator.TEXTURE_CUBE_MAP;
    this.fliter = filter || Tessellator.TEXTURE_FILTER_NEAREST_CLAMP;
    
    this.textures = new Array(6);
}

Tessellator.extend(Tessellator.TextureCubeMap, Tessellator.Texture);

Tessellator.TextureCubeMap.prototype.set = function (side, texture){
    this.textures[Tessellator.TextureCubeMap.INDEX_LOOKUP.indexOf(side)] = {
        texture: texture,
        target: side,
        ref: this,
        tessellator: this.tessellator,
    }
}

Tessellator.TextureCubeMap.prototype.get = function (side){
    return this.textures[Tessellator.TextureCubeMap.INDEX_LOOKUP.indexOf(side)].texture;
}

Tessellator.TextureCubeMap.prototype.configure = function (target, track){
    var gl = this.tessellator.GL;
    
    if (track.constructor === Tessellator.RenderMatrix){
        if (!this.texture){
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture = gl.createTexture());
            this.fliter(this.tessellator, this);
        }
        
        var ready = true;
        
        for (var i = 0; i < this.textures.length; i++){
            var tex = this.textures[i];
            
            if (!tex || !tex.texture.isReady()){
                ready = false;
            }else{
                tex.glTexture = this.texture;
                
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
                tex.texture.configure(tex.target, tex);
            }
        }
        
        if (ready){
            this.setReady();
        }
    }
}

Tessellator.POS_X = Tessellator.Constant.create("TEXTURE_CUBE_MAP_POSITIVE_X", Tessellator.vec3(-1, 0, 0));
Tessellator.NEG_X = Tessellator.Constant.create("TEXTURE_CUBE_MAP_NEGATIVE_X", Tessellator.vec3(1, 0, 0));
Tessellator.POS_Y = Tessellator.Constant.create("TEXTURE_CUBE_MAP_POSITIVE_Y", Tessellator.vec3(0, 1, 0));
Tessellator.NEG_Y = Tessellator.Constant.create("TEXTURE_CUBE_MAP_NEGATIVE_Y", Tessellator.vec3(0, -1, 0));
Tessellator.POS_Z = Tessellator.Constant.create("TEXTURE_CUBE_MAP_POSITIVE_Z", Tessellator.vec3(0, 0, 1));
Tessellator.NEG_Z = Tessellator.Constant.create("TEXTURE_CUBE_MAP_NEGATIVE_Z", Tessellator.vec3(0, 0, -1));

Tessellator.TextureCubeMap.INDEX_LOOKUP = [
    Tessellator.POS_X,
    Tessellator.NEG_X,
    Tessellator.POS_Y,
    Tessellator.NEG_Y,
    Tessellator.POS_Z,
    Tessellator.NEG_Z
];/**
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


//strict mode can be used with this.
"use strict";

Tessellator.TextureData = function (tessellator, width, height, dataType, storeType, data, filter){
    this.super(tessellator);
    
    this.width = width;
    this.height = height;
    this.data = data;
    this.filter = filter;
    
    dataType = dataType || Tessellator.RGBA;
    storeType = storeType || Tessellator.UNSIGNED_BYTE;
    
    if (!this.filter){
        this.filter = Tessellator.getAppropriateTextureFilter(this.width, this.height);
    }
    
    {
        var dataStorageType = Uint8Array;
        
        if (storeType === Tessellator.FLOAT || storeType === Tessellator.FLOAT32){
            if (this.filter.name.indexOf("LINEAR") >= 0){
                if (!tessellator.extensions.get("OES_texture_float_linear")){
                    throw "floating point linear textures not supported. Support for a non-linear texture filter may be possibe";
                }
            }else{
                if (!tessellator.extensions.get("OES_texture_float")){
                    throw "floating point textures not supported!";
                }
            }
            
            dataStorageType = Float32Array;
        }else if (storeType === Tessellator.FLOAT16){
            if (this.filter.name.indexOf("LINEAR") >= 0){
                if (!tessellator.extensions.get("OES_texture_half_float_linear")){
                    throw "half floating point linear textures not supported. Support for a non-linear texture filter may be possibe";
                }
            }else{
                if (!tessellator.extensions.get("OES_texture_half_float")){
                    throw "half floating point textures not supported!";
                }
            }
            
            dataStorageType = Uint16Array;
        }else if (storeType === Tessellator.UNSIGNED_SHORT_4_4_4_4){
            dataStorageType = Uint16Array;
        }else if (storeType === Tessellator.UNSIGNED_SHORT_5_5_5_1){
            dataStorageType = Uint16Array;
        }else if (storeType === Tessellator.UNSIGNED_SHORT_5_6_5){
            dataStorageType = Uint16Array;
        }
        
        if (!this.data){
            if (dataType === Tessellator.ALPHA){
                this.data = new dataStorageType(this.width * this.height * 1);
            }else if (dataType === Tessellator.LUMINANCE){
                this.data = new dataStorageType(this.width * this.height * 1);
            }else if (dataType === Tessellator.LUMINANCE_ALPHA){
                this.data = new dataStorageType(this.width * this.height * 2);
            }else if (dataType === Tessellator.RGB){
                this.data = new dataStorageType(this.width * this.height * 3);
            }else if (dataType === Tessellator.RGBA){
                this.data = new dataStorageType(this.width * this.height * 4);
            }
        }
        
        this.dataType = tessellator.glConst(dataType);
        this.storeType = tessellator.glConst(storeType);
    }
    
    this.setReady();
}

Tessellator.copyProto(Tessellator.TextureData, Tessellator.Texture);

Tessellator.TextureData.prototype.configure = function (target, track){
    var gl = this.tessellator.GL;
    if (this.isReady()){
        if (!track || track.constructor === Tessellator.RenderMatrix){
            track = null;
            
            if (!this.isTracking(track)){
                if (!this.texture){
                    gl.bindTexture(gl.TEXTURE_2D, this.texture = gl.createTexture());
                    this.filter(this.tessellator, this);
                }else{
                    gl.bindTexture(gl.TEXTURE_2D, this.texture);
                }
            }
        }
        
        if (!this.isTracking(track)){
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
            this.tessellator.GL.texImage2D(this.tessellator.glConst(target), 0, this.dataType, this.width, this.height, 0, this.dataType, this.storeType, this.data);
            
            this.track(track);
        }
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.TextureModelCubeMap = function (tessellator, size, model, pos, filter){
    this.super(tessellator, filter);
    
    this.model = model;
    this.renderer = new Tessellator.ModelCubeRenderer(tessellator, model, pos);
    
    for (var i = 0; i < Tessellator.TextureCubeMap.INDEX_LOOKUP.length; i++){
        var dir = Tessellator.TextureCubeMap.INDEX_LOOKUP[i];
        
        var texture = new Tessellator.TextureModel(this.tessellator, size, size, [
            new Tessellator.TextureModel.AttachmentDepth(),
            new Tessellator.TextureModel.AttachmentColor(),
            new Tessellator.TextureModel.AttachmentRenderer(this.renderer, dir.value)
        ]);
        
        this.set(dir, texture);
    }
}

Tessellator.extend(Tessellator.TextureModelCubeMap, Tessellator.TextureCubeMap);/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createTextureSolid = function (){
    return new Tessellator.TextureSolid(this, Tessellator.getColor(arguments).multiply(255));
}

Tessellator.TextureSolid = function (tessellator, color){
    var data = new Uint8Array(4);
    data.set(color);
    
    this.super(tessellator, 1, 1, Tessellator.RGBA, Tessellator.UNSIGNED_BYTE, data, Tessellator.TEXTURE_FILTER_NEAREST);
}

Tessellator.copyProto(Tessellator.TextureSolid, Tessellator.TextureData);/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createTextureDrawable = function (width, height, fliter){
    return new Tessellator.TextureDrawable(this, width, height, fliter)
}

Tessellator.TextureDrawable = function (tessellator, width, height, filter){
    this.super(tessellator, width, height, Tessellator.RGB, Tessellator.UNSIGNED_BYTE, null, filter);
    
    this.color = Tessellator.vec3(255);
}

Tessellator.copyProto(Tessellator.TextureDrawable, Tessellator.TextureData);

Tessellator.TextureDrawable.prototype.draw = function (arr, x, y, w, h){
    for (var yy = 0; yy < h; yy++){
        this.data.set(arr.subarray((h - yy - 1) * w * 3, (h - yy) * w * 3), ((this.height - (yy + y) - 1) * this.width + x) * 3);
    }
    
    this.update();
}

Tessellator.TextureDrawable.prototype.setColor = function (){
    var c = Tessellator.getColor(arguments).multiply(255);
    this.color[0] = c[0];
    this.color[1] = c[1];
    this.color[2] = c[2];
}

Tessellator.TextureDrawable.prototype.setPixel = function (x, y){
    if (x >= 0 && y >= 0 && x < this.width && y < this.height){
        this.data.set(this.color, ((this.height - y - 1) * this.width + x) * 3);
        
        this.update();
    }
}

Tessellator.TextureDrawable.prototype.getPixel = function (x, y){
    if (x >= 0 && y >= 0 && x < this.width && y < this.height){
        var s = ((this.height - y - 1) * this.width + x) * 3;
        
        return this.data.subarray(s, s + 3);
    }
}

Tessellator.TextureDrawable.prototype.fillRect = function (x, y, w, h){
    for (var xx = x; xx < x + w; xx++){
        for (var yy = y; yy < y + h; yy++){
            this.setPixel(xx, yy);
        }
    }
}

Tessellator.TextureDrawable.prototype.fillOval = function (x, y, w, h){
    for (var xx = x; xx < x + w; xx++){
        for (var yy = y; yy < y + h; yy++){
            var xxx = (xx - x) / w * 2 - 1;
            var yyy = (yy - y) / h * 2 - 1;
            
            if (Math.sqrt(xxx * xxx + yyy * yyy) < 1){
                this.setPixel(xx, yy);
            }
        }
    }
}

Tessellator.TextureDrawable.prototype.drawRect = function (x, y, w, h){
    this.drawLine(x, y, x + w, y);
    this.drawLine(x, y, x, y + h);
    this.drawLine(x + w, y, x + w, y + h);
    this.drawLine(x, y + h, x + w, y + h);
}

//TODO OPTIMIZATIONS
Tessellator.TextureDrawable.prototype.drawOval = function (x, y, w, h){
    var dude = function (xx, yy){
        var xxx = (xx - x) / w * 2 - 1;
        var yyy = (yy - y) / h * 2 - 1;
        
        return Math.sqrt(xxx * xxx + yyy * yyy) < 1;
    }
    
    for (var xx = x; xx < x + w; xx++){
        for (var yy = y; yy < y + h; yy++){
            if (dude(xx, yy) && (!dude(xx - 1, yy) || !dude(xx + 1, yy) || !dude(xx, yy - 1) || !dude(xx, yy + 1))){
                this.setPixel(xx, yy);
            }
        }
    }
}

Tessellator.TextureDrawable.prototype.drawLine = function (x0, y0, x1, y1){
    var
        dx = x1 - x0,
        dy = y1 - y0;
    
    if (dx === 0){
        if (dy < 0){
            dy = -dy;
            y1 = y0;
            y0 = y1 - dy;
        }
        
        for (var y = y0; y <= y1; y++){
            this.setPixel(x0, y);
        }
    }else{
        if (dx < 0){
            dx = -dx;
            x1 = x0;
            x0 = x1 - dx;
            
            dy = -dy;
            y1 = y0;
            y0 = y1 - dy;
        }
        
        var
            e = 0,
            de = Math.abs(dy / dx),
            y = y0;
        
        for (var x = x0; x <= x1; x++){
            this.setPixel(x, y);
            
            e += de;
            
            while (e >= .5){
                this.setPixel(x, y);
                y += y1 - y0 > 0 ? 1 : -1;
                e -= 1;
            }
        }
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.TextureDummy = function (ready){
    this.super(null);
    
    if (ready){
        this.setReady();
    }
}

Tessellator.extend(Tessellator.TextureDummy, Tessellator.Texture);

Tessellator.TextureDummy.prototype.configure = Tessellator.EMPTY_FUNC;
Tessellator.TextureDummy.prototype.bind = Tessellator.EMPTY_FUNC;/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.frameBuffer = {
    bindFramebuffer: function (last){
        last.tessellator.GL.bindFramebuffer(last.tessellator.GL.FRAMEBUFFER, null);
        last.tessellator.frameBuffer = Tessellator.prototype.frameBuffer;
    }
};

Tessellator.TextureModel = function (tessellator, width, height, attachments){
    this.super (tessellator);
    this.autoUpdate = true;
    
    this.disposable = true;
    this.configured = false;
    
    this.attachments = attachments;
    
    if (!this.attachments || this.attachments.constructor !== Array){
        this.attachments = [
            new Tessellator.TextureModel.AttachmentColor(this.attachments),
            new Tessellator.TextureModel.AttachmentDepth()
        ];
    }
    
    this.bindingAttachment = new Tessellator.TextureDummy();
    this.renderAttachment = null;
    
    this.setSize(width, height);
}

Tessellator.copyProto(Tessellator.TextureModel, Tessellator.Texture);

Tessellator.TextureModel.prototype.isReady = function (){
    return this.bindingAttachment && this.bindingAttachment.isReady();
}

Tessellator.TextureModel.prototype.setup = function (){
    this.disposeShallow();
    this.clearTracking();
    this.configured = false;
    
    this.frameBuffer = this.tessellator.GL.createFramebuffer();
    
    var lastFrameBuffer = this.tessellator.frameBuffer;
    this.bindFramebuffer();
    
    if (this.tessellator.extensions.get("WEBGL_draw_buffers")){
        this.buffers = [];
        this.buffers.ext = this.tessellator.extensions.get("WEBGL_draw_buffers");
    }
    
    for (var i = 0, k = this.attachments.length; i < k; i++){
        this.attachments[i].setup(this);
    }
    
    lastFrameBuffer.bindFramebuffer(this);
    this.setReady();
}

Tessellator.TextureModel.prototype.configure = function (target, track){
    if (this.isReady()){
        var lastFrameBuffer = this.tessellator.frameBuffer;
        this.bindFramebuffer();
        
        for (var i = 0; i < this.attachments.length; i++){
            this.attachments[i].configure(this, target, track);
        }
        
        if (this.autoUpdate || !this.isTracking(null)){
            this.renderAttachment.render(this, track);
            
            this.track(null);
        }
        
        lastFrameBuffer.bindFramebuffer(this);
        this.configured = true;
    }
}

Tessellator.TextureModel.prototype.render = function (track){
    if (!this.configured){
        this.configure(Tessellator.TEXTURE_2D, track);
    }else if (this.isReady()){
        var lastFrameBuffer = this.tessellator.frameBuffer;
        this.bindFramebuffer();
        
        this.renderAttachment.render(this);
        
        lastFrameBuffer.bindFramebuffer(this);
    }
}

Tessellator.TextureModel.prototype.bindFramebuffer = function (last){
    this.tessellator.GL.bindFramebuffer(this.tessellator.GL.FRAMEBUFFER, this.frameBuffer);
    this.tessellator.frameBuffer = this;
    
    if (this.buffers){
        this.buffers.ext.drawBuffersWEBGL(this.buffers);
    }
}

Tessellator.TextureModel.prototype.disposeShallow = function (){
    if (this.frameBuffer){
        this.tessellator.GL.deleteFramebuffer(this.frameBuffer);
        
        this.tessellator.resources.remove(this);
        this.frameBuffer = null;
    }
}

Tessellator.TextureModel.prototype.dispose = function (){
    this.disposeShallow();
    
    for (var i = 0, k = this.attachments.length; i < k; i++){
        this.attachments[i].dispose(this);
    }
}

Tessellator.TextureModel.prototype.setSize = function (width, height){
    width = width | 0;
    height = height | 0;
    
    if (this.width !== width || this.height !== height){
        this.width = width;
        this.height = height;
        
        this.setup();
    }
}

Tessellator.TextureModel.prototype.bind = function (){
    if (this.bindingAttachment){
        this.bindingAttachment.bind();
    }
}

Tessellator.TextureModel.prototype.getAttachment = function (c) {
    for (var i = 0, k = this.attachments.length; i < k; i++){
        if (this.attachments[i].constructor === c){
            return this.attachments[i];
        }
    }
    
    return null;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.TextureModel.AttachmentColor = function (filter, index, quality, channels){
    this.filter = filter;
    this.index = index || 0;
    this.quality = quality;
    this.channels = channels || Tessellator.RGBA;
}

Tessellator.copyProto(Tessellator.TextureModel.AttachmentColor, Tessellator.Texture);

Tessellator.TextureModel.AttachmentColor.prototype.setup = function (texture){
    if (this.tessellator && this.tessellator !== texture.tessellator){
        throw "cannot mix resources between multiple contexts";
    }
    
    if (!this.tessellator){
        this.super(texture.tessellator);
    }
    
    if (!this.quality){
        this.quality = texture.tessellator.GL.UNSIGNED_BYTE;
    }else{
        if (this.quality === Tessellator.FLOAT || this.quality === Tessellator.FLOAT32){
            texture.tessellator.extensions.get("OES_texture_float");
        }else if (this.quality === Tessellator.FLOAT16){
            texture.tessellator.extensions.get("OES_texture_half_float");
        }
        
        this.quality = texture.tessellator.glConst(this.quality);
    }
    
    this.channels = this.tessellator.glConst(this.channels);
    this.width = texture.width;
    this.height = texture.height;
    
    if (!this.filter){
        this.filter = Tessellator.getAppropriateTextureFilter(texture.width, texture.height);
    }
    
    if (texture.buffers){
        texture.buffers.push(texture.tessellator.GL.COLOR_ATTACHMENT0 + this.index);
    }
    
    if (this.index === 0){
        texture.bindingAttachment = this;
    }
    
    this.dispose();
    this.clearTracking();
    this.setReady();
}

Tessellator.TextureModel.AttachmentColor.prototype.configure = function (parent, target, track){
    var gl = parent.tessellator.GL;
    
    var tex;
    
    if (!track || track.constructor === Tessellator.RenderMatrix){
        if (track){
            track.dirty();
        }
        
        track = null;
        
        if (!this.isTracking(track)){
            gl.bindTexture(gl.TEXTURE_2D, this.texture = gl.createTexture());
            this.filter(parent.tessellator, this);
        }
        
        tex = this.texture;
    }
    
    if (!this.isTracking(track)){
        if (!tex){
            tex = track.glTexture;
        }
        
        gl.texImage2D(parent.tessellator.glConst(target), 0, this.channels, this.width, this.height, 0, this.channels, this.quality, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + this.index, parent.tessellator.glConst(target), tex, 0);
        
        this.track(track);
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.TextureModel.AttachmentDepth = function (){}

Tessellator.TextureModel.AttachmentDepth.prototype.setup = function (texture){
    var gl = texture.tessellator.GL;
    
    if (!this.buffers || this.width !== texture.width || this.height != texture.height){
        this.dispose(texture);
        
        this.buffer = gl.createRenderbuffer();
        this.width = texture.width;
        this.height = texture.height;
        this.tessellator = texture.tessellator;
        
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.buffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }
    
    
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.buffer);
}

Tessellator.TextureModel.AttachmentDepth.prototype.configure = Tessellator.EMPTY_FUNC;

Tessellator.TextureModel.AttachmentDepth.prototype.dispose = function (){
    if (this.buffer){
        this.tessellator.GL.deleteRenderbuffer(this.buffer);
        
        this.buffer = null;
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.TextureModel.AttachmentDepthTexture = function (filter){
    this.filter = filter;
}

Tessellator.copyProto(Tessellator.TextureModel.AttachmentDepthTexture, Tessellator.Texture);

Tessellator.TextureModel.AttachmentDepthTexture.prototype.setup = function (texture){
    if (this.tessellator && this.tessellator !== texture.tessellator){
        throw "cannot mix resources between multiple contexts";
    }
    
    if (!texture.tessellator.extensions.get("WEBGL_depth_texture")){
        throw "depth texture is not supported!";
    }
    
    if (!this.tessellator){
        this.super(texture.tessellator);
    }
    
    this.width = texture.width;
    this.height = texture.height;
    
    if (!this.filter){
        this.filter = Tessellator.getAppropriateTextureFilter(texture.width, texture.height);
    }
    
    if (texture.bindingAttachment.constructor === Tessellator.TextureDummy){
        texture.bindingAttachment = this;
    }
    
    this.dispose();
    this.clearTracking();
    this.setReady();
}

Tessellator.TextureModel.AttachmentDepthTexture.prototype.configure = function (parent, target, track){
    var gl = parent.tessellator.GL;
    
    var tex;
    
    if (!track || track.constructor === Tessellator.RenderMatrix){
        if (track){
            track.dirty();
        }
        
        track = null;
        
        
        if (!this.isTracking(track)){
            gl.bindTexture(gl.TEXTURE_2D, this.texture = gl.createTexture());
            this.filter(parent.tessellator, this);
        }
        
        tex = this.texture;
    }
    
    if (!this.isTracking(track)){
        if (!tex){
            tex = track.glTexture;
        }
        
        gl.texImage2D(parent.tessellator.glConst(target), 0, gl.DEPTH_COMPONENT, this.width, this.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, parent.tessellator.glConst(target), tex, 0);
        
        this.track(track);
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.TextureModel.AttachmentModel = function (model, renderer){
    this.model = model;
    this.renderer = renderer;
}

Tessellator.TextureModel.AttachmentModel.prototype.configure = Tessellator.EMPTY_FUNC;

Tessellator.TextureModel.AttachmentModel.prototype.setup = function (texture){
    texture.renderAttachment = this;
}

Tessellator.TextureModel.AttachmentModel.prototype.render = function (texture, render){
    if (this.model){
        var matrix = new Tessellator.RenderMatrix(this.renderer || render.renderer);
        
        matrix.set("window", Tessellator.vec2(texture.width, texture.height));
        
        (this.renderer || render.renderer).render(matrix, this.model);
        
        if (render && render.dirty){
            render.dirty();
        }
    }
    
    return true;
}

Tessellator.TextureModel.AttachmentModel.setModel = function (model){
    this.model = model;
}

Tessellator.TextureModel.AttachmentModel.prototype.dispose = function (){
    if (this.model && this.model.disposable){
        this.model.dispose();
        
        this.model = null;
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.TextureModel.AttachmentRenderer = function (renderer, arg){
    this.renderer = renderer;
    this.arg = arg;
}

Tessellator.TextureModel.AttachmentRenderer.prototype.configure = Tessellator.EMPTY_FUNC;

Tessellator.TextureModel.AttachmentRenderer.prototype.setup = function (texture){
    texture.renderAttachment = this;
}

Tessellator.TextureModel.AttachmentRenderer.prototype.render = function (texture, render){
    var matrix = new Tessellator.RenderMatrix(this.renderer);
    
    matrix.set("window", Tessellator.vec2(texture.width, texture.height));
    
    this.renderer.render(matrix, this.arg);
    
    if (render && render.dirty){
        render.dirty();
    }
}

Tessellator.TextureModel.AttachmentRenderer.prototype.dispose = function (){}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createTextureBuffered = function (){
    return Tessellator.new.apply(Tessellator.TextureBuffered, [this].concat(Array.prototype.slice.call(arguments)));
}

Tessellator.TextureBuffered = function (){
    this.tessellator = arguments[0];
    this.parentTexture = arguments[1];
    
    if (arguments.length === 4){
        this.width = arguments[2];
        this.height = arguments[3];
        
        if (!this.parentTexture.isReady()){
            var self = this;
            
            this.parentTexture.addListener(function (){
                self.init();
            });
        }else{
            this.init();
        }
    }else if (arguments.length === 3){
        var scale = arguments[2];
        
        if (!this.parentTexture.isReady()){
            var self = this;
            
            this.parentTexture.addListener(function (){
                self.width = self.parentTexture.width * scale;
                self.height = self.parentTexture.height * scale;
                
                self.init();
            });
        }else{
            this.width = this.parentTexture.width * scale;
            this.height = this.parentTexture.height * scale;
            
            this.init();
        }
    }else{
        throw "invalid arguments in Tessellator.CompressedTexture";
    }
}

Tessellator.extend(Tessellator.TextureBuffered, Tessellator.TextureModel);

Tessellator.TextureBuffered.prototype.init = function (){
    this.renderer = new Tessellator.FullScreenTextureRenderer(this.tessellator.createPixelShader(Tessellator.PIXEL_SHADER_PASS));
    
    this.super(this.tessellator, this.width, this.height, [
        new Tessellator.TextureModel.AttachmentColor(this.filter),
        new Tessellator.TextureModel.AttachmentRenderer(this.renderer, this.parentTexture),
    ]);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createTextureAtlas = function (){
    return Tessellator.new.apply(Tessellator.TextureAtlas, [this].concat(Array.prototype.slice.call(arguments)));
}

Tessellator.TextureAtlas = function (tessellator, width, height){
    if (!tessellator.textureAtlasRenderer){
        tessellator.textureAtlasRenderer = new Tessellator.AtlasRenderer(tessellator);
    }
    
    if (arguments.length === 4){
        this.atlas = arguments[3];
        
        this.updateAtlas();
    }else if (arguments.length === 5){
        if (isNaN(arguments[3])){
            this.atlas = arguments[3];
            this.filter = arguments[4];
            
            this.updateAtlas();
        }else{
            var
                segX = arguments[3],
                segY = arguments[4];
            
            this.atlas = new Array(segX);
            for (var i = 0; i < segX; i++){
                this.atlas[i] = new Array(segY);
            }
        }
    }else if (arguments.length === 6){
        var
            segX = arguments[3],
            segY = arguments[4];
        
        this.filter = arguments[5];
        
        this.atlas = new Array(segX);
        for (var i = 0; i < segX; i++){
            this.atlas[i] = new Array(segY);
        }
    }else{
        throw "invalid arguments";
    }
    
    this.super(tessellator, width, height, [
        new Tessellator.TextureModel.AttachmentColor(this.filter),
        new Tessellator.TextureModel.AttachmentRenderer(tessellator.textureAtlasRenderer, this),
    ]);
    
    this.disposable = false;
    this.updateCache = [];
}

Tessellator.copyProto(Tessellator.TextureAtlas, Tessellator.TextureModel);

Tessellator.TextureAtlas.prototype.updateAtlas = function (textures){
    if (textures){
        var self = this;
        
        if (!textures.update){
            textures.update = true;
            
            var func = function (){
                for (var i = 0; i < textures.length; i++){
                    if (!textures[i].texture.isReady()){
                        textures[i].texture.addListener(func);
                        
                        return;
                    }
                }
                
                self.updateCache.push(textures);
            }
            
            func();
        }
    }else{
        for (var x = 0, xk = this.atlas.length; x < xk; x++){
            for (var y = 0, yk = this.atlas[x].length; y < yk; y++){
                if (this.atlas[x][y]) this.updateAtlas(this.atlas[x][y]);
            }
        }
    }
}

Tessellator.TextureAtlas.prototype.set = function (x, y, texture){
    this.atlas[x][y] = [{
        texture: texture,
    }];
    
    this.atlas[x][y].pos = Tessellator.vec2(x, y);
    
    this.updateAtlas(this.atlas[x][y]);
}

Tessellator.TextureAtlas.prototype.get = function (x, y, i){
    return this.atlas[x][y][i || 0].texture;
}

Tessellator.TextureAtlas.prototype.add = function (x, y, texture){
    if (!this.atlas[x][y]){
        this.set.apply(this, arguments);
    }else{
        this.atlas[x][y].push({
            texture: texture
        });
        
        this.updateAtlas(this.atlas[x][y]);
    }
}

Tessellator.TextureAtlas.prototype.mask = function (x, y, mask, i){
    this.atlas[x][y][i || 0].mask = mask;
    
    this.updateAtlas(this.atlas[x][y]);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createTextureAtlasAnimation = function (){
    return Tessellator.new.apply(Tessellator.TextureAtlasAnimation, [this].concat(Array.prototype.slice.call(arguments)));
}

Tessellator.TextureAtlasAnimation = function (tessellator, src, animationRate, animation){
    if (!src){
        throw "no source!";
    }
    
    this.tessellator = tessellator;
    
    this.src = src;
    this.animationRate = animationRate || 1;
    this.animation = animation;
    this.time = 0;
    this.size = 1;
    
    if (src.isReady()){
        this.size = Math.min(src.width, src.height);
        
        if (src.width % this.size !== 0 || src.height & this.size !== 0){
            throw "texture not uniform size";
        }
        
        this.frames = Math.max(src.width / this.size, src.height / this.size);
        
        this.init();
    }else{
        var self = this;
        
        src.addListener(function (){
            self.size = Math.min(src.width, src.height);
            
            if (src.width % self.size !== 0 || src.height & self.size !== 0){
                throw "texture not uniform size";
            }
            
            self.frames = Math.max(src.width / self.size, src.height / self.size);
            
            self.init();
        });
    }
    
    if (!this.tessellator.shaderTextureAtlasAnimation){
        this.tessellator.shaderTextureAtlasAnimation = new Tessellator.AtlasAnimationRenderer(Tessellator.ATLAS_SHADER_ANIMATION.create(this.tessellator));
    }
}

Tessellator.copyProto(Tessellator.TextureAtlasAnimation, Tessellator.TextureModel);

Tessellator.TextureAtlasAnimation.prototype.init = function (){
    this.super(this.tessellator, this.size, this.size, [
        new Tessellator.TextureModel.AttachmentColor(),
        new Tessellator.TextureModel.AttachmentRenderer(this.tessellator.shaderTextureAtlasAnimation, this)
    ]);
    
    this.autoUpdate = false;
    
    this.super.configure(Tessellator.TEXTURE_2D);
}

Tessellator.TextureAtlasAnimation.prototype.configure = function (target, matrix){
    if (this.isReady()){
        var frame;
        
        if (this.animation){
            frame = this.animation[Math.floor(this.time / this.animationRate) % this.animation.length];
        }else{
            frame = Math.floor(this.time / this.animationRate) % this.frames;
        }
        
        if (frame !== this.frame){
            this.frame = frame;
            
            this.render(matrix);
        }
        
        this.time++;
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Shader = function (tessellator, type){
    this.tessellator = tessellator;
    
    if (type){
        this.create(type);
    }
    
    this.ready = false;
    this.disposable = true;
}

Tessellator.Shader.prototype.setReady = function (){
    this.ready = true;
    
    if (this.listener){
        this.listener(this);
    }
}

Tessellator.Shader.prototype.isReady = function (){
    return this.ready;
}

Tessellator.Shader.prototype.loadDOM = function (dom){
    if (!dom){
        return;
    }else if (dom.constructor === String){
        dom = document.getElementById(dom);
    }
    
    
    if (!this.shader){
        var type;
        
        if (dom.type == "shader/fragment" || dom.type == "shader/pixel"){
            type = this.tessellator.GL.FRAGMENT_SHADER;
        }else if (dom.type == "shader/vertex"){
            type = this.tessellator.GL.VERTEX_SHADER;
        }else{
            throw "unknown shader: " + dom.type;
        }
        
        this.create(type);
    }
    
    var self = this;
    
    Tessellator.getSourceText(dom, function (source){
        self.load(source);
    });
    
    return this;
}

Tessellator.Shader.prototype.loadRemote = function (src){
    var self = this;
    
    Tessellator.getRemoteText(src, function (source){
        self.load(source);
    });
    
    return this;
}

Tessellator.Shader.prototype.load = function (source){
    if (!source){
        throw "no source!";
    }else if (!this.shader){
        throw "no shader!";
    }
    
    {
        var gl = this.tessellator.GL;
        
        gl.shaderSource(this.shader, source);
        gl.compileShader(this.shader);
        
        if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
            var error;
            
            if (this.type === gl.FRAGMENT_SHADER){
                error = "fragment shader problem";
            }else if (this.type === gl.VERTEX_SHADER){
                error = "vertex shader problem";
            }
            
            var t = [];
            t.type = error;
            
            t.toString = function (){
                var s = [];
                
                s.push(this.type + ":");
                
                for (var i = 0; i < this.length; i++){
                    s.push(this[i].raw);
                }
                
                return s.join("\n");
            }
            
            var info = gl.getShaderInfoLog(this.shader);
            var lines = info.split("\n");
            
            for (var i = 0; i < lines.length; i++){
                if (!lines[i].trim().length){
                    continue;
                }
                
                var ii = lines[i].indexOf(":");
                
                if (ii > 0){
                    var o = {
                        raw: lines[i]
                    };
                    
                    var m = 0;
                    
                    o.type = lines[i].substring(0, ii);
                    
                    var iii = lines[i].indexOf(":", ii + 1);
                    
                    if (iii > 0){
                        var c = parseInt(lines[i].substring(ii + 1, iii).trim());
                        var iv = lines[i].indexOf(":", iii + 1);
                        
                        if (iv > 0){
                            var l = parseInt(lines[i].substring(iii + 1, iv).trim());
                            
                            o.line = l;
                            o.char = c;
                            
                            m = iv + 1;
                        }else{
                            o.line = l;
                            
                            m = iii + 1;
                        }
                    }else{
                        m = ii + 1;
                    }
                    
                    o.info = lines[i].substring(m);
                    
                    t.push(o);
                }else{
                    t.push({
                        type: "unknown",
                        info: lines[i]
                    });
                }
            }
            
            throw t;
        }
    }
    
    this.setReady();
    
    return this;
}

Tessellator.Shader.prototype.create = function (type){
    if (this.shader){
        throw "shader is already initialized!";
    }else{
        this.type = this.tessellator.glConst(type);
        this.shader = this.tessellator.GL.createShader(this.type);
    }
    
    return this;
}

Tessellator.Shader.prototype.dispose = function (){
    if (this.shader){
        this.tessellator.GL.deleteShader(this.shader);
    }
}

Tessellator.Shader.prototype.onLink = Tessellator.EMPTY_FUNC;

Tessellator.Shader.prototype.onProgramLoad = Tessellator.EMPTY_FUNC;/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Program = function (tessellator){
    this.tessellator = tessellator;
    
    this.linked = [];
    this.shader = this.tessellator.GL.createProgram();
    this.ready = false;
    this.active = false;
    
    this.attribs = {};
    this.uniforms = {};
    this.uedits = 0;
    
    this.disposable = false;
}

Tessellator.Program.prototype.link = function (shader){
    if (shader.constructor === Tessellator.ShaderPreset){
        shader = shader.create(this.tessellator);
    }
    
    this.linked.push(shader);
    
    if (shader.isReady()){
        var res = shader.onLink(this);
        
        if (res === undefined || res){
            this.tessellator.GL.attachShader(this.shader, shader.shader);
        }
    }else{
        var self = this;
        
        shader.listener = function (shader){
            var res = shader.onLink(self);
        
            if (res === undefined || res){
                self.tessellator.GL.attachShader(self.shader, shader.shader);
            }
            
            if (self.listener){
                self.listener(shader);
            }
        }
    }
    
    return this;
}

Tessellator.Program.prototype.load = function (){
    var ready = true;
    
    for (var i = 0; i < this.linked.length; i++){
        if (!this.linked[i].isReady()){
            ready = false;
            break;
        }
    }
    
    if (!ready){
        var self = this;
        
        this.listener = self.load;
    }else{
        var gl = this.tessellator.GL;
        
        for (var i = 0; i < this.linked.length; i++){
            this.linked[i].onProgramLoad(this);
        }
        
        gl.linkProgram(this.shader);
        
        if (!gl.getProgramParameter(this.shader, gl.LINK_STATUS)){
            var error = gl.getProgramInfoLog(this.shader);
            
            throw "unable to load shader program: " + error;
        }
        
        {
            var attribs = gl.getProgramParameter(this.shader, gl.ACTIVE_ATTRIBUTES);
            
            this.attributeCount = attribs;
            
            for (var i = 0; i < attribs; i++){
                var attrib = gl.getActiveAttrib(this.shader, i);
                
                this.attribs[attrib.name] = i;
            }
        }
        
        {
            var uniforms = gl.getProgramParameter(this.shader, gl.ACTIVE_UNIFORMS);
            
            this.uniformCount = uniforms;
            this.uniformSpace = 0;
            
            for (var i = 0; i < uniforms; i++){
                var uniform = gl.getActiveUniform(this.shader, i);
                
                if (uniform.type === gl.FLOAT_MAT4){
                    this.uniformSpace += uniform.size * 4;
                }else if (uniform.type === gl.FLOAT_MAT3){
                    this.uniformSpace += uniform.size * 3;
                }else if (uniform.type === gl.FLOAT_MAT2){
                    this.uniformSpace += uniform.size * 2;
                }else{
                    this.uniformSpace += uniform.size;
                }
                
                var name;
                
                if (uniform.size > 1){
                    name = uniform.name.substring(0, uniform.name.length - 3);
                }else{
                    name = uniform.name;
                }
                
                var inherit = Tessellator.Program.DEFAULT_UNIFORM_INHERITER[this.tessellator.tessConst(uniform.type)]
                
                this.uniforms[name] = {
                    tessellator: this.tessellator,
                    name: name,
                    value: null,
                    initialValue: true,
                    inherit: inherit,
                    configure: inherit.configure,
                    map: inherit.map,
                    startMap: inherit.startMap,
                    location: gl.getUniformLocation(this.shader, name),
                    shader: this,
                    size: uniform.size,
                    type: this.tessellator.tessConst(uniform.type),
                    edits: 0,
                };
                
            }
            
            if (this.uniformSpace > this.tessellator.maxUniformSpace){
                console.error("The amount of uniforms exceeded the maximum! There may be problems!");
            }
        }
        
        this.setReady();
    }
    
    return this;
}

Tessellator.Program.prototype.setReady = function (){
    this.ready = true;
}

Tessellator.Program.prototype.isReady = function (){
    return this.ready;
}

Tessellator.Program.prototype.hasUniform = function (key){
    return key in this.uniforms;
}

Tessellator.Program.prototype.uniform = function (key, value, matrix, reason){
    var u = this.uniforms[key];
    
    if (u){
        u.configure(value, matrix, reason);
        u.initialValue = false;
        u.edits++;
    }
}

Tessellator.Program.prototype.preUnify = function (matrix){
    for (var o in this.uniforms){
        var u = this.uniforms[o];
        
        if (u.startMap){
            u.startMap(matrix, matrix.gets(o));
        }
    }
}

Tessellator.Program.prototype.unify = function (matrix){
    for (var o in this.uniforms){
        var u = this.uniforms[o];
        
        if (u.map){
            u.map(matrix);
        }
        
        if (!u.initialValue && u.inherit && u.edits !== u.lastUnify){
            u.inherit(matrix);
            
            u.lastUnify = u.edits;
            this.uedits++;
        }
    }
}

Tessellator.Program.prototype.setInheriter = function (key, value){
    if (!value.configure){
        value.configure = Tessellator.Program.DEFAULT_CONFIG;
    }
    
    var u = this.uniforms[key];
    
    if (u){
        u.inherit = value;
        u.configure = u.inherit.configure;
        u.map = u.inherit.map;
        u.startMap = u.inherit.startMap;
        
        if (u.edits === undefined){
            u.edits = 0;
        }
    }else{
        u = {
            configure: value.configure,
            tessellator: this.tessellator,
            shader: this
        };
        
        this.uniforms[key] = u;
    }
    
    return this;
}

Tessellator.Program.prototype.dispose = function (){
    for (var i = 0; i < this.linked.length; i++){
        if (this.linked[i].disposable){
            this.linked[i].dispose();
        }
    }
    
    this.tessellator.GL.deleteProgram(this.shader);
    
    return this;
}

Tessellator.Program.prototype.bind = function (){
    if (this.tessellator.shader !== this){
        if (this.tessellator.shader){
            this.tessellator.shader.replaced(this);
        }
        
        this.tessellator.shader = this;
        this.tessellator.GL.useProgram(this.shader);
        
        return true;
    }
    
    return false;
}

Tessellator.Program.prototype.set = function (){
    return this.isReady();
}

Tessellator.Program.prototype.postSet = function (){}

Tessellator.Program.prototype.replaced = function (){}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Program.I1_UNIFY_FUNC = function (){
    this.shader.tessellator.GL.uniform1i(this.location, this.value);
}

Tessellator.Program.F1_UNIFY_FUNC = function (){
    var value;
    
    if (this.value.length){
        value = this.value[0];
    }else{
        value = this.value;
    }
    
    this.shader.tessellator.GL.uniform1f(this.location, value);
}

Tessellator.Program.UNIFY_WINDOW = function (){
    if (this.location){
        this.shader.tessellator.GL.uniform2fv(this.location, this.value);
    }
}

Tessellator.Program.UNIFY_WINDOW.configure = function (value){
    this.value = value;
    
    this.shader.tessellator.GL.viewport(0, 0, this.value[0], this.value[1]);
}

Tessellator.Program.F1V_UNIFY_FUNC = function (){
    this.shader.tessellator.GL.uniform1fv(this.location, this.value);
}

Tessellator.Program.F2V_UNIFY_FUNC = function (){
    this.shader.tessellator.GL.uniform2fv(this.location, this.value);
}

Tessellator.Program.F3V_UNIFY_FUNC = function (){
    this.shader.tessellator.GL.uniform3fv(this.location, this.value);
}

Tessellator.Program.F4V_UNIFY_FUNC = function (){
    this.shader.tessellator.GL.uniform4fv(this.location, this.value);
}

Tessellator.Program.MAT4_UNIFY_FUNC = function (){
    this.shader.tessellator.GL.uniformMatrix4fv(this.location, false, this.value);
}

Tessellator.Program.MAT3_UNIFY_FUNC = function (){
    this.shader.tessellator.GL.uniformMatrix3fv(this.location, false, this.value);
}

Tessellator.Program.MAT2_UNIFY_FUNC = function (){
    this.shader.tessellator.GL.uniformMatrix2fv(this.location, false, this.value);
};

Tessellator.Program.BIND_TEXTURE_2D = function (render){
    var gl = this.shader.tessellator.GL;
    
    gl.activeTexture(gl.TEXTURE0 + Tessellator.Program.textureUnit);
    gl.uniform1i(this.location, Tessellator.Program.textureUnit);
    
    if (this.value){
        this.value.bind();
    }else{
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
}

Tessellator.Program.BIND_TEXTURE_2D.map = function (matrix){
    Tessellator.Program.textureUnit++;
}

Tessellator.Program.BIND_TEXTURE_2D.startMap = function (matrix, value){
    if (value && this.inherit && value.lastFrameUpdate !== this.shader.tessellator.frame){
        value.lastFrameUpdate = this.shader.tessellator.frame;
        
        value.configure(Tessellator.TEXTURE_2D, matrix);
    }
    
    Tessellator.Program.textureUnit = -1;
}

Tessellator.Program.BIND_TEXTURE_CUBE = function (render){
    var gl = this.shader.tessellator.GL;
    
    gl.activeTexture(gl.TEXTURE0 + Tessellator.Program.textureUnit);
    gl.uniform1i(this.location, Tessellator.Program.textureUnit);
    
    if (this.value){
        this.value.bind();
    }else{
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    }
}

Tessellator.Program.BIND_TEXTURE_CUBE.map = function (matrix){
    Tessellator.Program.textureUnit++;
}

Tessellator.Program.BIND_TEXTURE_CUBE.startMap = function (matrix, value){
    if (value && this.inherit && value.lastFrameUpdate !== this.shader.tessellator.frame){
        value.lastFrameUpdate = this.shader.tessellator.frame;
        
        value.configure(Tessellator.TEXTURE_CUBE_MAP, matrix);
    }
    
    Tessellator.Program.textureUnit = -1;
}

Tessellator.Program.MV_MATRIX_UNIFY_FUNC = function (){
    this.shader.tessellator.GL.uniformMatrix4fv(this.location, false, this.value);
    
    if (this.shader.uniforms.nMatrix){
        this.shader.tessellator.GL.uniformMatrix3fv(this.shader.uniforms.nMatrix.location, false, Tessellator.Program.lightNormalCache.normalFromMat4(this.value));
    }
}

Tessellator.Program.lightNormalCache = Tessellator.mat3();

Tessellator.Program.DEFAULT_CONFIG = function (value){
    this.value = value;
}

Tessellator.Program.DEFAULT_UNIFORM_INHERITER = {};

(function (){
    this[Tessellator.FLOAT_MAT4] = Tessellator.Program.MAT4_UNIFY_FUNC;
    this[Tessellator.FLOAT_MAT3] = Tessellator.Program.MAT3_UNIFY_FUNC;
    this[Tessellator.FLOAT_MAT2] = Tessellator.Program.MAT2_UNIFY_FUNC;
    
    this[Tessellator.FLOAT_VEC4] = Tessellator.Program.F4V_UNIFY_FUNC;
    this[Tessellator.INT_VEC4] = Tessellator.Program.F4V_UNIFY_FUNC;
    this[Tessellator.BOOL_VEC4] = Tessellator.Program.F4V_UNIFY_FUNC;
    
    this[Tessellator.FLOAT_VEC3] = Tessellator.Program.F3V_UNIFY_FUNC;
    this[Tessellator.INT_VEC3] = Tessellator.Program.F3V_UNIFY_FUNC;
    this[Tessellator.BOOL_VEC3] = Tessellator.Program.F3V_UNIFY_FUNC;
    
    this[Tessellator.FLOAT_VEC2] = Tessellator.Program.F2V_UNIFY_FUNC;
    this[Tessellator.INT_VEC2] = Tessellator.Program.F2V_UNIFY_FUNC;
    this[Tessellator.BOOL_VEC2] = Tessellator.Program.F2V_UNIFY_FUNC;
    
    this[Tessellator.FLOAT] = Tessellator.Program.F1_UNIFY_FUNC;
    this[Tessellator.INT] = Tessellator.Program.I1_UNIFY_FUNC;
    
    this[Tessellator.SAMPLER_2D] = Tessellator.Program.BIND_TEXTURE_2D;
    this[Tessellator.SAMPLER_CUBE] = Tessellator.Program.BIND_TEXTURE_CUBE;
}).call (Tessellator.Program.DEFAULT_UNIFORM_INHERITER);

for (var o in Tessellator.Program.DEFAULT_UNIFORM_INHERITER){
    if (!Tessellator.Program.DEFAULT_UNIFORM_INHERITER[o].configure){
        Tessellator.Program.DEFAULT_UNIFORM_INHERITER[o].configure = Tessellator.Program.DEFAULT_CONFIG;
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.ShaderPreset = function (){
    if (arguments.length === 2){
        this.configureCreate(arguments[0], arguments[1]);
    }else{
        this.create = arguments[0];
    }
}

Tessellator.ShaderPreset.prototype.configureCreate = function (type, code){
    this.shaders = [];
    this.type = type;
    
    this.create = function (tessellator){
        for (var i = 0; i < this.shaders.length; i++){
            if (this.shaders[i][0] === tessellator){
                return this.shaders[i][1];
            }
        }
        
        var shader = new Tessellator.Shader(tessellator, type).load(code);
        
        this.shaders.push([tessellator, shader]);
        
        return shader;
    }
}

Tessellator.ShaderPreset.prototype.configureDrawDependant = function (svert1, sfrag1, svert2, sfrag2, svert3, sfrag3){
    this.create = function (tessellator){
        return new Tessellator.ShaderSetDrawDependant(
            [
                Tessellator.COLOR,
                Tessellator.LINE,
                Tessellator.TEXTURE
            ],
            [
                tessellator.createShaderProgram(svert1, sfrag1),
                tessellator.createShaderProgram(svert3, sfrag3),
                tessellator.createShaderProgram(svert2, sfrag2),
            ]
        );
    }
    
    return this;
}

Tessellator.ShaderPreset.prototype.configureStandardPair = function (svert, sfrag){
    this.create = function (tessellator) {
        return tessellator.createShaderProgram(svert, sfrag);
    }
    
    return this;
}

Tessellator.PIXEL_SHADER_VERTEX_SHADER = new Tessellator.ShaderPreset(Tessellator.VERTEX_SHADER, "precision lowp float;attribute vec2 position;uniform vec2 aspect;varying vec2 texturePos;void main(void){texturePos=(position+1.0)/2.0;gl_Position=vec4(position*(aspect+1.),0.0,1.0);}");
Tessellator.ATLAS_ANIMATION_VERTEX_SHADER = new Tessellator.ShaderPreset(Tessellator.VERTEX_SHADER, "precision lowp float;attribute vec2 position;attribute vec2 textureCoord;varying vec2 texturePos;void main(void){texturePos=textureCoord;gl_Position=vec4(position,0.0,1.0);}");
Tessellator.ATLAS_VERTEX_SHADER = new Tessellator.ShaderPreset(Tessellator.VERTEX_SHADER, "precision lowp float;attribute vec2 position;uniform vec2 atlasDims;uniform vec2 atlas;varying vec2 texturePos;void main(void){texturePos=(position+1.0)/2.0;gl_Position=vec4((atlas+texturePos)/atlasDims*2.0-1.0,0.0,1.0);}");

Tessellator.PIXEL_SHADER_BLACK = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;void main(void){gl_FragColor=vec4(0,0,0,1);}");
Tessellator.PIXEL_SHADER_WHITE = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;void main(void){gl_FragColor=vec4(1,1,1,1);}");
Tessellator.PIXEL_SHADER_COLOR = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;uniform vec4 color;varying vec2 texturePos;void main(void){gl_FragColor=color;}");
Tessellator.PIXEL_SHADER_PASS = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform sampler2D sampler;void main(void){gl_FragColor=texture2D(sampler,texturePos);}");
Tessellator.PIXEL_SHADER_RGB = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform sampler2D sampler;void main(void){gl_FragColor=vec4(texture2D(sampler,texturePos).xyz,1);}");
Tessellator.PIXEL_SHADER_FLIP_X = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform sampler2D sampler;void main(void){gl_FragColor=texture2D(sampler,vec2(1.-texturePos.x,texturePos.y));}");
Tessellator.PIXEL_SHADER_FLIP_Y = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform sampler2D sampler;void main(void){gl_FragColor=texture2D(sampler,vec2(texturePos.x,1.-texturePos.y));}");
Tessellator.PIXEL_SHADER_BLACK_AND_WHITE = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform sampler2D sampler;void main(void){vec4 o=texture2D(sampler,texturePos);float color=(o.x+o.y+o.z)/3.0;gl_FragColor=vec4(color,color,color,o.w);}");
Tessellator.PIXEL_SHADER_INVERT_COLOR = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform sampler2D sampler;void main(void){vec4 o=texture2D(sampler,texturePos);gl_FragColor=vec4(1.0-o.xyz,o.w);}");
Tessellator.PIXEL_SHADER_FILTER = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform vec3 mask;uniform sampler2D sampler;void main(void){vec4 o=texture2D(sampler,texturePos);float color=(o.x*mask.x+o.y*mask.y+o.z*mask.z)/(mask.x+mask.y+mask.z);gl_FragColor=vec4(vec3(color)*mask, o.w);}");
Tessellator.PIXEL_SHADER_MASK = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform vec4 mask;uniform sampler2D sampler;void main(void){vec4 o=texture2D(sampler,texturePos);gl_FragColor=o*mask;}");
Tessellator.PIXEL_SHADER_RED_FILTER = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform sampler2D sampler;void main(void){vec4 o=texture2D(sampler,texturePos);gl_FragColor=vec4(o.x,0,0,o.w);}");
Tessellator.PIXEL_SHADER_GREEN_FILTER = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform sampler2D sampler;void main(void){vec4 o=texture2D(sampler,texturePos);gl_FragColor=vec4(0,o.y,0,o.w);}");
Tessellator.PIXEL_SHADER_BLUE_FILTER = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform sampler2D sampler;void main(void){vec4 o=texture2D(sampler,texturePos);gl_FragColor=vec4(0,0,o.z,o.w);}");
Tessellator.PIXEL_SHADER_QUALITY_FILTER = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;uniform float quality;varying vec2 texturePos;uniform sampler2D sampler;void main(void){vec4 o=texture2D(sampler,texturePos);gl_FragColor=vec4(floor(o.xyz*quality+0.5)/quality,o.w);}");
Tessellator.PIXEL_SHADER_NOISE = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;uniform sampler2D sampler;uniform float time,intensity;uniform vec2 window;varying vec2 texturePos;float rand(vec2 co){return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);}float rand(float m){return tan(rand(vec2(gl_FragCoord.x/window.x*cos(time)*3.243,gl_FragCoord.y/window.y/tan(time*5.9273)*.918)*m));}void main(void){vec4 c=texture2D(sampler,texturePos);gl_FragColor=c+(vec4(rand(1.+c.z),rand(1.72+c.x),rand(.829+c.y),1)*2.-1.)*intensity;}");
Tessellator.PIXEL_SHADER_TRANSLATE = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform mat2 translate;uniform sampler2D sampler;void main(void){gl_FragColor=texture2D(sampler,(texturePos*2.-1.)*translate/2.+.5);}");
Tessellator.PIXEL_SHADER_DEPTH = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform sampler2D sampler;void main(void){gl_FragColor=texture2D(sampler,texturePos).xxxw;}");

Tessellator.PIXEL_SHADER_CUBE_MAP = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform mat4 perspective;uniform samplerCube sampler;void main(void){vec4 pos=vec4(texturePos*2.-1.,1,1)*perspective;gl_FragColor=textureCube(sampler,pos.xyz/pos.w);}");

Tessellator.PIXEL_SHADER_BLEND = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform float weight;uniform sampler2D sampler,sampler2;void main(void){gl_FragColor=texture2D(sampler,texturePos)*(1.-weight)+texture2D(sampler2,texturePos)*weight;}");
Tessellator.PIXEL_SHADER_SLIDE = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform float weight;uniform sampler2D sampler,sampler2;void main(void){vec2 pos=texturePos;pos.x+=weight;if(pos.x<1.){gl_FragColor=texture2D(sampler,pos);}else{gl_FragColor=texture2D(sampler2,vec2(texturePos.x-(1.-weight),texturePos.y));}}");
Tessellator.PIXEL_SHADER_SLIDE_IN = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform float weight;uniform sampler2D sampler,sampler2;void main(void){gl_FragColor=texture2D(sampler,texturePos);if(texturePos.x+weight>1.){gl_FragColor=texture2D(sampler2,vec2(texturePos.x-(1.-weight),texturePos.y));}}");
Tessellator.PIXEL_SHADER_SLICE_IN = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform float weight;uniform sampler2D sampler,sampler2;uniform vec2 window;void main(void){gl_FragColor=texture2D(sampler,texturePos);bool dir=int(mod(gl_FragCoord.y/window.y*8.,2.))==0;if(dir?texturePos.x-weight<0.:texturePos.x+weight>1.){gl_FragColor=texture2D(sampler2,vec2(dir?texturePos.x+(1.-weight):texturePos.x-(1.-weight),texturePos.y));}}");
Tessellator.PIXEL_SHADER_RADIAL = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision lowp float;varying vec2 texturePos;uniform vec2 window;uniform float weight;uniform sampler2D sampler,sampler2;void main(void){vec2 cube=(gl_FragCoord.xy/window*2.-1.);if(length(cube)>weight*sqrt(2.)){gl_FragColor=texture2D(sampler,texturePos);}else{gl_FragColor=texture2D(sampler2, texturePos);}}");

Tessellator.PIXEL_SHADER_BLUR = new Tessellator.ShaderPreset(function (tessellator, resX, resY){
    return tessellator.createPixelShader("precision highp float;const int resX=" + (resX | 5) + ",resY=" + (resY | 4) + ";uniform float intensity;const float TAU=atan(1.0)*8.0;varying vec2 texturePos;uniform sampler2D sampler;void main(void){vec4 color=texture2D(sampler,texturePos);int index=1;for(int y=1;y<=resY;y++){float len=float(y)/float(resY)*intensity;for(int x=0;x<resX;x++){index++;float rad=float(x)/float(resX)*TAU;color+=texture2D(sampler,texturePos+vec2(sin(rad),cos(rad))*len/16.0);}}gl_FragColor=color/float(index);}");
});

Tessellator.ATLAS_SHADER = new Tessellator.ShaderPreset().configureStandardPair(
    Tessellator.ATLAS_VERTEX_SHADER,
    Tessellator.PIXEL_SHADER_MASK
    
);

Tessellator.ATLAS_SHADER_ANIMATION = new Tessellator.ShaderPreset().configureStandardPair(
    Tessellator.ATLAS_ANIMATION_VERTEX_SHADER,
    Tessellator.PIXEL_SHADER_PASS
);

Tessellator.MODEL_VIEW_FRAGMENT_LIGHTING_VERTEX_SHADER_COLOR = new Tessellator.ShaderPreset(Tessellator.VERTEX_SHADER, "attribute vec3 position;attribute vec4 color;attribute vec3 normal;uniform mat4 mvMatrix;uniform mat4 pMatrix;uniform mat3 nMatrix;varying vec3 lightNormal;varying vec4 mvPosition;varying vec4 vColor;void main(void){mvPosition=mvMatrix*vec4(position,1.0);gl_Position=pMatrix*mvPosition;lightNormal=normalize(nMatrix*normal);vColor=color;}");
Tessellator.MODEL_VIEW_FRAGMENT_LIGHTING_FRAGMENT_SHADER_COLOR = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision mediump float;const int lightCount=32;uniform vec4 clip;uniform vec2 window;uniform float specular;varying vec4 vColor;varying vec3 lightNormal;varying vec4 mvPosition;uniform sampler2D lights;vec3 getLightMask(void){vec3 lightMask=vec3(0);for(float i=0.;i<256.;i++){vec4 light0=texture2D(lights,vec2(0./4.,i/256.));int type=int(light0.x);vec3 color=light0.yzw;if(type==0){lightMask+=color;break;}else if(type==1){lightMask+=color;}else if(type==2){vec3 dir=texture2D(lights,vec2(1./4.,i/256.)).xyz;float intensity=max(0.,dot(lightNormal,dir));lightMask+=color*intensity;}else if(type==3){vec3 pos=texture2D(lights,vec2(1./4.,i/256.)).xyz;vec3 npos=normalize(pos-mvPosition.xyz);vec3 look=normalize(-mvPosition.xyz);vec3 reflection=reflect(-npos,lightNormal);float specularLight=0.0;if(specular>=1.0){specularLight=pow(max(0.,dot(reflect(-npos,lightNormal),normalize(-mvPosition.xyz))),specular);}float intensity=max(0.,dot(lightNormal,npos))+specularLight;lightMask+=color*intensity;}else if(type==4){vec4 light1=texture2D(lights,vec2(1./4.,i/256.));vec3 pos=light1.xyz;float range=light1.w;vec3 dist=pos-mvPosition.xyz;float length=sqrt(dist.x*dist.x+dist.y*dist.y+dist.z*dist.z);if(range>=length){vec3 npos=dist/length;float specularLight=0.0;if(specular>1.0){specularLight=pow(max(0.,dot(reflect(-npos,lightNormal),normalize(-mvPosition.xyz))),specular);}float intensity=max(0.,dot(lightNormal,npos))+specularLight;lightMask+=color*intensity*((range-length)/range);}}else if(type==5){vec4 light1=texture2D(lights,vec2(1./4.,i/256.));vec4 light2=texture2D(lights,vec2(2./4.,i/256.));vec3 pos=light1.xyz;vec3 npos=normalize(pos-mvPosition.xyz);vec3 vec=light2.xyz;float size=light2.w;if(dot(vec,npos)>size){vec3 look=normalize(-mvPosition.xyz);vec3 reflection=reflect(-npos,lightNormal);float specularLight=0.0;if(specular>=1.0){specularLight=pow(max(0.,dot(reflect(-npos,lightNormal),normalize(-mvPosition.xyz))),specular);}float intensity=max(0.,dot(lightNormal,npos))+specularLight;lightMask+=color*intensity;}}else if(type==6){vec4 light1=texture2D(lights,vec2(1./4.,i/256.));vec4 light2=texture2D(lights,vec2(2./4.,i/256.));vec3 pos=light1.xyz;float range=light1.w;vec3 dist=pos-mvPosition.xyz;float length=sqrt(dist.x*dist.x+dist.y*dist.y+dist.z*dist.z);vec3 npos=dist/length;vec3 vec=light2.xyz;float size=light2.w;if(range>length&&dot(vec,npos)>size){vec3 look=normalize(-mvPosition.xyz);vec3 reflection=reflect(-npos,lightNormal);float specularLight=0.0;if(specular>=1.0){specularLight=pow(max(0.,dot(reflect(-npos,lightNormal),normalize(-mvPosition.xyz))),specular);}float intensity=max(0.,dot(lightNormal,npos))+specularLight;lightMask+=color*intensity*((range-length)/range);}}else{return lightMask;}}return lightMask;}void main(void){{float xarea=gl_FragCoord.x/window.x;float yarea=gl_FragCoord.y/window.y;if(xarea<clip.x||yarea<clip.y||clip.x+clip.z<xarea||clip.y+clip.w<yarea){discard;}}vec4 mainColor=vColor;if(mainColor.w==0.0){discard;}else{if(lightNormal.x!=0.0||lightNormal.y!=0.0||lightNormal.z!=0.0){mainColor*=vec4(getLightMask(),1.0);}gl_FragColor=mainColor;}}");
Tessellator.MODEL_VIEW_FRAGMENT_LIGHTING_VERTEX_SHADER_TEXTURE = new Tessellator.ShaderPreset(Tessellator.VERTEX_SHADER, "attribute vec3 position;attribute vec2 color;attribute vec3 normal;uniform mat4 mvMatrix;uniform mat4 pMatrix;uniform mat3 nMatrix;varying vec3 lightNormal;varying vec4 mvPosition;varying vec2 vTexture;void main(void){mvPosition=mvMatrix*vec4(position,1.0);gl_Position=pMatrix*mvPosition;lightNormal=normalize(nMatrix*normal);vTexture=color;}");
Tessellator.MODEL_VIEW_FRAGMENT_LIGHTING_FRAGMENT_SHADER_TEXTURE = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision mediump float;const int lightCount=32;uniform sampler2D texture;uniform vec4 mask;uniform vec4 clip;uniform vec2 window;uniform float specular;varying vec2 vTexture;varying vec3 lightNormal;varying vec4 mvPosition;uniform sampler2D lights;vec3 getLightMask(void){vec3 lightMask=vec3(0);for(float i=0.;i<256.;i++){vec4 light0=texture2D(lights,vec2(0./4.,i/256.));int type=int(light0.x);vec3 color=light0.yzw;if(type==0){lightMask+=color;break;}else if(type==1){lightMask+=color;}else if(type==2){vec3 dir=texture2D(lights,vec2(1./4.,i/256.)).xyz;float intensity=max(0.,dot(lightNormal,dir));lightMask+=color*intensity;}else if(type==3){vec3 pos=texture2D(lights,vec2(1./4.,i/256.)).xyz;vec3 npos=normalize(pos-mvPosition.xyz);vec3 look=normalize(-mvPosition.xyz);vec3 reflection=reflect(-npos,lightNormal);float specularLight=0.0;if(specular>=1.0){specularLight=pow(max(0.,dot(reflect(-npos,lightNormal),normalize(-mvPosition.xyz))),specular);}float intensity=max(0.,dot(lightNormal,npos))+specularLight;lightMask+=color*intensity;}else if(type==4){vec4 light1=texture2D(lights,vec2(1./4.,i/256.));vec3 pos=light1.xyz;float range=light1.w;vec3 dist=pos-mvPosition.xyz;float length=sqrt(dist.x*dist.x+dist.y*dist.y+dist.z*dist.z);if(range>=length){vec3 npos=dist/length;float specularLight=0.0;if(specular>1.0){specularLight=pow(max(0.,dot(reflect(-npos,lightNormal),normalize(-mvPosition.xyz))),specular);}float intensity=max(0.,dot(lightNormal,npos))+specularLight;lightMask+=color*intensity*((range-length)/range);}}else if(type==5){vec4 light1=texture2D(lights,vec2(1./4.,i/256.));vec4 light2=texture2D(lights,vec2(2./4.,i/256.));vec3 pos=light1.xyz;vec3 npos=normalize(pos-mvPosition.xyz);vec3 vec=light2.xyz;float size=light2.w;if(dot(vec,npos)>size){vec3 look=normalize(-mvPosition.xyz);vec3 reflection=reflect(-npos,lightNormal);float specularLight=0.0;if(specular>=1.0){specularLight=pow(max(0.,dot(reflect(-npos,lightNormal),normalize(-mvPosition.xyz))),specular);}float intensity=max(0.,dot(lightNormal,npos))+specularLight;lightMask+=color*intensity;}}else if(type==6){vec4 light1=texture2D(lights,vec2(1./4.,i/256.));vec4 light2=texture2D(lights,vec2(2./4.,i/256.));vec3 pos=light1.xyz;float range=light1.w;vec3 dist=pos-mvPosition.xyz;float length=sqrt(dist.x*dist.x+dist.y*dist.y+dist.z*dist.z);vec3 npos=dist/length;vec3 vec=light2.xyz;float size=light2.w;if(range>length&&dot(vec,npos)>size){vec3 look=normalize(-mvPosition.xyz);vec3 reflection=reflect(-npos,lightNormal);float specularLight=0.0;if(specular>=1.0){specularLight=pow(max(0.,dot(reflect(-npos,lightNormal),normalize(-mvPosition.xyz))),specular);}float intensity=max(0.,dot(lightNormal,npos))+specularLight;lightMask+=color*intensity*((range-length)/range);}}else{return lightMask;}}return lightMask;}void main(void){{float xarea=gl_FragCoord.x/window.x;float yarea=gl_FragCoord.y/window.y;if(xarea<clip.x||yarea<clip.y||clip.x+clip.z<xarea||clip.y+clip.w<yarea){discard;}}vec4 mainColor=texture2D(texture,vTexture)*mask;if(mainColor.w==0.0){discard;}else{if(lightNormal.x!=0.0||lightNormal.y!=0.0||lightNormal.z!=0.0){mainColor.xyz*=getLightMask();}gl_FragColor=mainColor;}}");

Tessellator.MODEL_VIEW_VERTEX_LIGHTING_VERTEX_SHADER_COLOR = new Tessellator.ShaderPreset(Tessellator.VERTEX_SHADER, "attribute vec3 position;attribute vec4 color;attribute vec3 normal;const int lightCount=32;uniform mat4 mvMatrix;uniform mat4 pMatrix;uniform mat3 nMatrix;vec3 lightNormal;vec4 mvPosition;varying vec4 vColor;uniform sampler2D lights;vec3 getLightMask(void){vec3 lightMask=vec3(0);for(float i=0.;i<256.;i++){vec4 light0=texture2D(lights, vec2(0./4.,i/256.));int type=int(light0.x);vec3 color=light0.yzw;if(type==0){lightMask+=color;break;}else if(type==1){lightMask+=color;}else if(type==2){vec3 dir=texture2D(lights, vec2(1./4.,i/256.)).xyz;float intensity=max(0.,dot(lightNormal,dir));lightMask+=color*intensity;}else if(type==3){vec3 pos=texture2D(lights, vec2(1./4.,i/256.)).xyz;vec3 npos=normalize(pos-mvPosition.xyz);vec3 look=normalize(-mvPosition.xyz);vec3 reflection=reflect(-npos,lightNormal);float intensity=max(0.,dot(lightNormal,npos));lightMask+=color*intensity;}else if(type==4){vec4 light1=texture2D(lights, vec2(1./4.,i/256.));vec3 pos=light1.xyz;float range=light1.w;vec3 dist=pos-mvPosition.xyz;float length=sqrt(dist.x*dist.x+dist.y*dist.y+dist.z*dist.z);if(range>=length){vec3 npos=dist/length;float intensity=max(0.,dot(lightNormal,npos));lightMask+=color*intensity*((range-length)/range);}}else if(type==5){vec4 light1=texture2D(lights, vec2(1./4.,i/256.));vec4 light2=texture2D(lights, vec2(2./4.,i/256.));vec3 pos=light1.xyz;vec3 npos=normalize(pos-mvPosition.xyz);vec3 vec=light2.xyz;float size=light2.w;if(dot(vec,npos)>size){vec3 look=normalize(-mvPosition.xyz);vec3 reflection=reflect(-npos,lightNormal);float intensity=max(0.,dot(lightNormal,npos));lightMask+=color*intensity;}}else if(type==6){vec4 light1=texture2D(lights, vec2(1./4.,i/256.));vec4 light2=texture2D(lights, vec2(2./4.,i/256.));vec3 pos=light1.xyz;float range=light1.w;vec3 dist=pos-mvPosition.xyz;float length=sqrt(dist.x*dist.x+dist.y*dist.y+dist.z*dist.z);vec3 npos=dist/length;vec3 vec=light2.xyz;float size=light2.w;if(range>length&&dot(vec,npos)>size){vec3 look=normalize(-mvPosition.xyz);vec3 reflection=reflect(-npos,lightNormal);float intensity=max(0.,dot(lightNormal,npos));lightMask+=color*intensity*((range-length)/range);}}else{return lightMask;}}return lightMask;}void main(void){mvPosition=mvMatrix*vec4(position,1.0);gl_Position=pMatrix*mvPosition;vColor=color;lightNormal=normalize(nMatrix*normal);vColor.rgb*=getLightMask();}");
Tessellator.MODEL_VIEW_VERTEX_LIGHTING_FRAGMENT_SHADER_COLOR = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision mediump float;uniform vec4 clip;uniform vec2 window;varying vec4 vColor;void main(void){{float xarea=gl_FragCoord.x/window.x;float yarea=gl_FragCoord.y/window.y;if(xarea<clip.x||yarea<clip.y||clip.x+clip.z<xarea||clip.y+clip.w<yarea){discard;}}if(vColor.w==0.0){discard;}else{gl_FragColor=vColor;}}");
Tessellator.MODEL_VIEW_VERTEX_LIGHTING_VERTEX_SHADER_TEXTURE = new Tessellator.ShaderPreset(Tessellator.VERTEX_SHADER, "attribute vec3 position;attribute vec2 color;attribute vec3 normal;const int lightCount=32;uniform mat4 mvMatrix;uniform mat4 pMatrix;uniform mat3 nMatrix;varying vec2 vTexture;varying vec3 lightMask;vec3 lightNormal;vec4 mvPosition;uniform sampler2D lights;vec3 getLightMask(void){vec3 lightMask=vec3(0);for(float i=0.;i<256.;i++){vec4 light0=texture2D(lights, vec2(0./4.,i/256.));int type=int(light0.x);vec3 color=light0.yzw;if(type==0){lightMask+=color;break;}else if(type==1){lightMask+=color;}else if(type==2){vec3 dir=texture2D(lights, vec2(1./4.,i/256.)).xyz;float intensity=max(0.,dot(lightNormal,dir));lightMask+=color*intensity;}else if(type==3){vec3 pos=texture2D(lights, vec2(1./4.,i/256.)).xyz;vec3 npos=normalize(pos-mvPosition.xyz);vec3 look=normalize(-mvPosition.xyz);vec3 reflection=reflect(-npos,lightNormal);float intensity=max(0.,dot(lightNormal,npos));lightMask+=color*intensity;}else if(type==4){vec4 light1=texture2D(lights, vec2(1./4.,i/256.));vec3 pos=light1.xyz;float range=light1.w;vec3 dist=pos-mvPosition.xyz;float length=sqrt(dist.x*dist.x+dist.y*dist.y+dist.z*dist.z);if(range>=length){vec3 npos=dist/length;float intensity=max(0.,dot(lightNormal,npos));lightMask+=color*intensity*((range-length)/range);}}else if(type==5){vec4 light1=texture2D(lights, vec2(1./4.,i/256.));vec4 light2=texture2D(lights, vec2(2./4.,i/256.));vec3 pos=light1.xyz;vec3 npos=normalize(pos-mvPosition.xyz);vec3 vec=light2.xyz;float size=light2.w;if(dot(vec,npos)>size){vec3 look=normalize(-mvPosition.xyz);vec3 reflection=reflect(-npos,lightNormal);float intensity=max(0.,dot(lightNormal,npos));lightMask+=color*intensity;}}else if(type==6){vec4 light1=texture2D(lights, vec2(1./4.,i/256.));vec4 light2=texture2D(lights, vec2(2./4.,i/256.));vec3 pos=light1.xyz;float range=light1.w;vec3 dist=pos-mvPosition.xyz;float length=sqrt(dist.x*dist.x+dist.y*dist.y+dist.z*dist.z);vec3 npos=dist/length;vec3 vec=light2.xyz;float size=light2.w;if(range>length&&dot(vec,npos)>size){vec3 look=normalize(-mvPosition.xyz);vec3 reflection=reflect(-npos,lightNormal);float intensity=max(0.,dot(lightNormal,npos));lightMask+=color*intensity*((range-length)/range);}}else{return lightMask;}}return lightMask;}void main(void){mvPosition=mvMatrix*vec4(position,1.0);gl_Position=pMatrix*mvPosition;lightNormal=normalize(nMatrix*normal);lightMask=getLightMask();vTexture=color;}");
Tessellator.MODEL_VIEW_VERTEX_LIGHTING_FRAGMENT_SHADER_TEXTURE = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision mediump float;uniform sampler2D texture;uniform vec4 mask;uniform vec4 clip;uniform vec2 window;varying vec2 vTexture;varying vec3 lightMask;void main(void){{float xarea=gl_FragCoord.x/window.x;float yarea=gl_FragCoord.y/window.y;if(xarea<clip.x||yarea<clip.y||clip.x+clip.z<xarea||clip.y+clip.w<yarea){discard;}}vec4 mainColor=texture2D(texture,vTexture)*mask;mainColor.xyz*=lightMask;if(mainColor.w==0.0){discard;}else{gl_FragColor=mainColor;}}");

Tessellator.MODEL_VIEW_VERTEX_SHADER_COLOR = new Tessellator.ShaderPreset(Tessellator.VERTEX_SHADER, "attribute vec3 position;attribute vec4 color;uniform mat4 mvMatrix;uniform mat4 pMatrix;varying vec4 vColor;void main(void){gl_Position=pMatrix*mvMatrix*vec4(position,1.0);vColor=color;}");
Tessellator.MODEL_VIEW_FRAGMENT_SHADER_COLOR = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision mediump float;uniform vec4 clip;uniform vec2 window;varying vec4 vColor;void main(void){{float xarea=gl_FragCoord.x/window.x;float yarea=gl_FragCoord.y/window.y;if(xarea<clip.x||yarea<clip.y||clip.x+clip.z<xarea||clip.y+clip.w<yarea){discard;}}if(vColor.w==0.0){discard;}else{gl_FragColor=vColor;}}");
Tessellator.MODEL_VIEW_VERTEX_SHADER_TEXTURE = new Tessellator.ShaderPreset(Tessellator.VERTEX_SHADER, "attribute vec3 position;attribute vec2 color;uniform mat4 mvMatrix;uniform mat4 pMatrix;varying vec2 vTexture;void main(void){gl_Position=pMatrix*mvMatrix*vec4(position,1.0);vTexture=color;}");
Tessellator.MODEL_VIEW_FRAGMENT_SHADER_TEXTURE = new Tessellator.ShaderPreset(Tessellator.FRAGMENT_SHADER, "precision mediump float;uniform sampler2D texture;uniform vec4 mask;uniform vec4 clip;uniform vec2 window;varying vec2 vTexture;void main(void){{float xarea=gl_FragCoord.x/window.x;float yarea=gl_FragCoord.y/window.y;if(xarea<clip.x||yarea<clip.y||clip.x+clip.z<xarea||clip.y+clip.w<yarea){discard;}}vec4 mainColor=texture2D(texture,vTexture)*mask;if(mainColor.w==0.0){discard;}else{gl_FragColor=mainColor;}}");

Tessellator.MODEL_VIEW_FRAGMENT_LIGHTING_SHADER = new Tessellator.ShaderPreset().configureDrawDependant(
    Tessellator.MODEL_VIEW_FRAGMENT_LIGHTING_VERTEX_SHADER_COLOR,
    Tessellator.MODEL_VIEW_FRAGMENT_LIGHTING_FRAGMENT_SHADER_COLOR,
    Tessellator.MODEL_VIEW_FRAGMENT_LIGHTING_VERTEX_SHADER_TEXTURE,
    Tessellator.MODEL_VIEW_FRAGMENT_LIGHTING_FRAGMENT_SHADER_TEXTURE,
    Tessellator.MODEL_VIEW_VERTEX_SHADER_COLOR,
    Tessellator.MODEL_VIEW_FRAGMENT_SHADER_COLOR
);

Tessellator.MODEL_VIEW_VERTEX_LIGHTING_SHADER = new Tessellator.ShaderPreset().configureDrawDependant(
    Tessellator.MODEL_VIEW_VERTEX_LIGHTING_VERTEX_SHADER_COLOR,
    Tessellator.MODEL_VIEW_VERTEX_LIGHTING_FRAGMENT_SHADER_COLOR,
    Tessellator.MODEL_VIEW_VERTEX_LIGHTING_VERTEX_SHADER_TEXTURE,
    Tessellator.MODEL_VIEW_VERTEX_LIGHTING_FRAGMENT_SHADER_TEXTURE,
    Tessellator.MODEL_VIEW_VERTEX_SHADER_COLOR,
    Tessellator.MODEL_VIEW_FRAGMENT_SHADER_COLOR
);

Tessellator.MODEL_VIEW_SHADER = new Tessellator.ShaderPreset().configureDrawDependant(
    Tessellator.MODEL_VIEW_VERTEX_SHADER_COLOR,
    Tessellator.MODEL_VIEW_FRAGMENT_SHADER_COLOR,
    Tessellator.MODEL_VIEW_VERTEX_SHADER_TEXTURE,
    Tessellator.MODEL_VIEW_FRAGMENT_SHADER_TEXTURE,
    Tessellator.MODEL_VIEW_VERTEX_SHADER_COLOR,
    Tessellator.MODEL_VIEW_FRAGMENT_SHADER_COLOR
);

Tessellator.DEPTH_MAP_VERTEX_SHADER = "attribute vec3 position;uniform mat4 mvMatrix;uniform mat4 pMatrix;varying vec4 vecp;varying lowp float hasNormal;void main(void){vecp=pMatrix*mvMatrix*vec4(position,1.0);gl_Position=vecp;}";
Tessellator.DEPTH_MAP_FRAGMENT_SHADER = "precision lowp float;varying vec4 vecp;void main(void){float depth=(vecp.z/vecp.w+1.0)/2.0;gl_FragColor=vec4(depth,depth,depth,1);}";

Tessellator.DEPTH_MAP_SHADER = new Tessellator.ShaderPreset().configureStandardPair(
    Tessellator.DEPTH_MAP_VERTEX_SHADER,
    Tessellator.DEPTH_MAP_FRAGMENT_SHADER
);/**
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


//strict mode can be used with this.
"use strict";

Tessellator.ShaderSetDrawDependant = function (drawMode, shaders){
    if (drawMode.length !== shaders.length){
        throw "the length of the arrays does not match!";
    }
    
    this.drawMode = drawMode;
    this.shaders = shaders;
    
    for (var i = 0, k = this.shaders.length; i < k; i++){
        if (this.tessellator){
            if (this.tessellator !== this.shaders[i].tessellator){
                throw "not uniform tessellator!";
            }
        }else{
            this.tessellator = this.shaders[i].tessellator;
        }
    }
}

Tessellator.ShaderSetDrawDependant.prototype.init = function (){
    if (this.shader){
        this.shader.init();
    }
}

Tessellator.ShaderSetDrawDependant.prototype.postInit = function (){
    if (this.shader){
        this.shader.postInit();
    }
}

Tessellator.ShaderSetDrawDependant.prototype.hasUniform = function (key){
    if (this.shader){
        return this.shader.hasUniform(key);
    }else{
        return this.shaders[0].hasUniform(key);
    } 
}

Tessellator.ShaderSetDrawDependant.prototype.set = function (matrix, render, draw){
    var drawMode = draw.drawMode;
    
    for (var i = 0, k = this.drawMode.length; i < k; i++){
        if (i + 1 === k || drawMode === this.drawMode[i]){
            this.shader = this.shaders[i];
            this.uniforms = this.shader.uniforms;
            this.attribs = this.shader.attribs;
            
            return this.shader.set();
        }
    }
    
    return false;
}

Tessellator.ShaderSetDrawDependant.prototype.postSet = function (){
    this.shader.postSet();
}

Tessellator.ShaderSetDrawDependant.prototype.setInheriter = function (key, value){
    for (var i = 0, k = this.shaders.length; i < k; i++){
        this.shaders[i].setInheriter(key, value);
    }
}

Tessellator.ShaderSetDrawDependant.prototype.dispose = function (key, value){
    for (var i = 0, k = this.shaders.length; i < k; i++){
        this.shaders[i].dispose();
    }
}

Tessellator.ShaderSetDrawDependant.prototype.unify = function (matrix){
    this.shader.unify(matrix);
}

Tessellator.ShaderSetDrawDependant.prototype.preUnify = function (matrix){
    this.shader.preUnify(matrix);
}

Tessellator.ShaderSetDrawDependant.prototype.uniform = function (key, value, matrix, reason){
    this.shader.uniform(key, value, matrix, reason);
}

Tessellator.ShaderSetDrawDependant.prototype.bind = function (){
    return this.shader.bind();
}

Tessellator.ShaderSetDrawDependant.prototype.isReady = function (){
    return true;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createShaderProgram = function (vertexShader, fragmentShader){
    if (vertexShader.constructor === Tessellator.ShaderPreset){
        if (vertexShader.type !== Tessellator.VERTEX_SHADER){
            throw "the vertexShader argument is set to something else then a vertex shader";
        }
        
        vertexShader = vertexShader.create(this);
    }else if (vertexShader.constructor !== Tessellator.Shader){
        var shader = new Tessellator.Shader(this, Tessellator.VERTEX_SHADER);
        
        if (vertexShader.constructor === String){
            if (vertexShader.indexOf(".glsl", vertexShader.length - 5) !== -1){
                shader.loadRemote(vertexShader);
            }else{
                shader.load(vertexShader);
            }
        }else{
            shader.loadDOM(vertexShader);
        }
        
        vertexShader = shader;
    }
    
    if (fragmentShader.constructor === Tessellator.ShaderPreset){
        if (fragmentShader.type !== Tessellator.FRAGMENT_SHADER){
            throw "the fragmentShader argument is set to something else then a fragment shader";
        }
        
        fragmentShader = fragmentShader.create(this);
    }else if (fragmentShader.constructor !== Tessellator.Shader){
        var shader = new Tessellator.Shader(this, Tessellator.FRAGMENT_SHADER);
        
        if (fragmentShader.constructor === String){
            if (fragmentShader.indexOf(".glsl", fragmentShader.length - 5) !== -1){
                shader.loadRemote(fragmentShader);
            }else{
                shader.load(fragmentShader);
            }
        }else{
            shader.loadDOM(fragmentShader);
        }
        
        fragmentShader = shader;
    }
    
    return new Tessellator.Program(this).link(vertexShader).link(fragmentShader).load();
}

Tessellator.prototype.loadShaderProgram = Tessellator.prototype.createShaderProgram;
Tessellator.prototype.loadShaderProgramFromCode = Tessellator.prototype.createShaderProgram;
Tessellator.prototype.loadShaderProgramFromDOM = Tessellator.prototype.createShaderProgram;

Tessellator.prototype.createPixelShader = function (shader){
    return this.createShaderProgram(Tessellator.PIXEL_SHADER_VERTEX_SHADER, shader);
}

Tessellator.prototype.getShaderFromDOM = function (dom){
    return new Tessellator.Shader(this).loadDOM(dom);
}


Tessellator.prototype.getShader = function (shaderSource, type){
    if (shaderSource.constructor === Tessellator.ShaderPreset){
        console.warn("Passing a Tessellator.ShaderPreset to the getShader helper function in not recommended.")
        return shaderSource.create(this);
    }
    
    return new Tessellator.Shader(this, type).load(shaderSource);
}

Tessellator.prototype.createBypassShader = function (){
    return this.createPixelShader(tessellator.getShader(Tessellator.PIXEL_SHADER_PASS, Tessellator.FRAGMENT_SHADER));
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.createObject = function (){
    return Tessellator.new.apply(Tessellator.Object, [this].concat(arguments));
}

Tessellator.Object = function (tessellator, type){
    tessellator.resources.push(this);
    
    this.attribs = {};
    this.attribCount = 0;
    
    this.uniforms = {};
    this.uniformCount = 0;
    
    this.tessellator = tessellator;
    this.type = type;
    this.renderType = type;
    
    this.disposed = false;
    this.disposable = true;
    
    this.resetIndices();
}

Tessellator.Object.prototype.setType = function (type){
    this.type = type;
    this.renderType = type;
}

Tessellator.Object.prototype.resetIndices = function (type){
    if (type === Uint32Array && !this.tessellator.extensions.get("OES_element_index_uint")){
        throw "Usigned Integer indices are not supported.";
    }
    
    if (this.indices){
        this.indices.buffer.dispose(this.tessellator);
    }
    
    this.indices = {
        name: "indices",
        buffer: new Tessellator.Object.Buffer(new Tessellator.FragmentedArray(), type || Uint16Array, Tessellator.ELEMENT_ARRAY_BUFFER, Tessellator.STATIC)
    }
}

Tessellator.Object.prototype.getValue = function (name){
    var o = this.attribs[name];
    
    if (o){
        return o.buffer.value;
    }
}

Tessellator.Object.prototype.getIndices = function (){
    return this.indices.buffer.value;
}

Tessellator.Object.prototype.setAttribute = function (){
    if (arguments[2].constructor === Tessellator.Object.Buffer){
        var name = arguments[0];
        
        this.attribCount += this.attribs[name] ? 0 : 1;
    
        if (this.attribCount > this.tessellator.maxAttributes){
            throw "the maximum amount of bound attributes was exceeded: " + this.tessellator.maxAttributes;
        }
        
        if (this.attribs[name]){
            this.attribs[name].buffer.dispose(this.tessellator);
        }
        
        this.attribs[name] = {
            name: name,
            dataSize: (isNaN(arguments[1]) ? arguments[1].value : arguments[1]),
            buffer: arguments[2],
            normalize: arguments[3] || false,
            stride: arguments[4] || arguments[1].value,
            offset: arguments[5] || 0,
        }
    }else{
        var
            name = arguments[0],
            size = arguments[1], 
            value = arguments[2], 
            arrayType = arguments[3], 
            normalize = arguments[4], 
            type = arguments[5], 
            stride = arguments[6], 
            offset = arguments[7];
        
        this.setAttribute(name, size, new Tessellator.Object.Buffer(value, arrayType, Tessellator.ARRAY_BUFFER, type), normalize, stride, offset);
    }
}

Tessellator.Object.prototype.setUniform = function (name, value){
    if (!this.uniforms[name]){
        this.uniformCount++;
    }
    
    this.uniforms[name] = value;
}

Tessellator.Object.prototype.setAttributeData = function (name, value, off){
    off = off || 0;
    var attrib = this.attribs[name];
    
    if (!attrib){
        throw "that attribute does not exist!";
    }
    
    attrib.buffer.subData(tessellator, value, off);
}

Tessellator.Object.prototype.upload = function (){
    if (this.oes){
        this.oes.shader = null;
    }
    
    if (this.indices && !this.indices.buffer.uploaded){
        if (this.indices.buffer.getLength() && !this.indices.buffer.uploaded){
            this.indices.buffer.upload(this.tessellator);
            
            this.items = this.indices.buffer.getLength();
        }else{
            this.indices = null;
            
            for (var o in this.attribs){
                this.items = this.attribs[o].buffer.getLength() / this.attribs[o].dataSize;
                
                break;
            }
        }
    }
    
    var ext = Tessellator.Object.getTypeExtension(this.type);
    
    if (ext){
        this.renderType = ext(this);
    }
    
    for (var o in this.attribs){
        this.attribs[o].buffer.upload(this.tessellator);
    }
}

Tessellator.Object.prototype.bindAttributes = function (shader){
    var gl = this.tessellator.GL;
    
    var bound = null;
    
    for (var o in this.attribs){
        if (shader.attribs[o] !== undefined){
            var oo = this.attribs[o];
            
            if (oo.buffer.uploaded){
                if (bound !== oo.buffer){
                    bound = oo.buffer;
                    
                    gl.bindBuffer(this.tessellator.glConst(oo.buffer.type), bound.value);
                }
                
                gl.enableVertexAttribArray(shader.attribs[o]);
                gl.vertexAttribPointer(shader.attribs[o], oo.dataSize, gl[Tessellator.Object.dataTypes[oo.buffer.dataType.name]], oo.normalize, oo.stride * Tessellator.Object.dataTypeSizes[oo.buffer.dataType.name], oo.offset * Tessellator.Object.dataTypeSizes[oo.buffer.dataType.name]);
                
                if (oo.divisor !== undefined && this.instancinginstance){
                    this.instancinginstance.vertexAttribDivisorANGLE(shader.attribs[o], oo.divisor);
                }
            }
        }
    }
    
    if (this.indices){
        gl.bindBuffer(this.tessellator.glConst(this.indices.buffer.type), this.indices.buffer.value);
    }
}

Tessellator.Object.prototype.disableAttributes = function (shader){
    for (var o in shader.attribs){
        var oo = this.attribs[o];
        
        if (oo){
            this.tessellator.GL.disableVertexAttribArray(shader.attribs[o]);
            
            if (oo.divisor !== undefined && this.instancinginstance){
                this.instancinginstance.vertexAttribDivisorANGLE(shader.attribs[o], 0);
            }
        }
    }
}

Tessellator.Object.prototype.useOES = function (){
    if (!this.oesinsance){
        this.oesinsance = this.tessellator.extensions.get("OES_vertex_array_object");
            
        if (this.oesinsance){
            this.oes = {
                instance: this.oesinsance.createVertexArrayOES()
            }
        }
    }
    
    return this.oesinsance;
}

Tessellator.Object.prototype.useInstancing = function (){
    if (!this.instancinginstance){
        this.instancinginstance = this.tessellator.extensions.get("ANGLE_instanced_arrays");
    }
    
    var self = this;
    
    var func = function (name, divisor){
        divisor = divisor === undefined ? 1 : divisor
        
        var o = self.attribs[name];
        
        o.divisor = divisor;
        self.instances = o.buffer.getLength() / o.dataSize * divisor;
    }
    
    for (var i = 0; i < arguments.length; i++){
        func(arguments[i]);
    }
    
    return func;
}

Tessellator.Object.prototype.render = function (shader){
    if (!this.items){
        return;
    }
    
    if (shader.constructor === Tessellator.RenderMatrix){
        var matrix = shader;
        shader = shader.renderer.shader;
        
        if (this.uniformCount > 0){
            matrix = matrix.copy();
            
            for (var o in this.uniforms){
                matrix.set(o, this.uniforms[o]);
            }
        }
        
        if (!shader.set(matrix.renderer, matrix, this)){
            return;
        }
        
        shader.preUnify(matrix);
        
        if (!shader.set(matrix.renderer, matrix, this)){
            return;
        }
        
        if (shader.bind()){
            matrix.unifyAll();
        }else{
            matrix.unify();
        }
    }else if (!shader.isReady()){
        return;
    }
    
    if (this.oes){
        this.oesinsance.bindVertexArrayOES(this.oes.instance);
        
        if (this.oes.shader !== shader){
            if (this.oes.shader){
                this.disableAttributes(this.oes.shader);
            }
            
            this.oes.shader = shader;
            
            this.bindAttributes(shader);
        }
    }else{
        this.bindAttributes(shader);
    }
    
    var gl = this.tessellator.GL;
    
    if (this.instancinginstance && this.instances){
        if (this.indices){
            this.instancinginstance.drawElementsInstancedANGLE(this.tessellator.glConst(this.renderType), this.items, gl[Tessellator.Object.dataTypes[this.indices.buffer.dataType.name]], 0, this.instances);
        }else{
            this.instancinginstance.drawArraysInstancedANGLE(this.tessellator.glConst(this.renderType), 0, this.items, this.instances);
        }
    }else{
        if (this.indices){
            gl.drawElements(this.tessellator.glConst(this.renderType), this.items, gl[Tessellator.Object.dataTypes[this.indices.buffer.dataType.name]], 0);
        }else{
            gl.drawArrays(this.tessellator.glConst(this.renderType), 0, this.items);
        }
    }
    
    if (this.oes){
        this.oesinsance.bindVertexArrayOES(null);
    }else{
        this.disableAttributes(shader);
    }
    
    if (matrix){
        shader.postSet(matrix.renderer, matrix, this);
    }
}

Tessellator.Object.prototype.apply = Tessellator.Object.prototype.render;

Tessellator.Object.prototype.dispose = function (){
    if (!this.disposed){
        for (var o in this.attribs){
            this.attribs[o].buffer.dispose(this.tessellator);
        }
        
        if (this.indices){
            this.indices.buffer.dispose(this.tessellator);
        }
        
        if (this.oes){
            this.oesinsance.deleteVertexArrayOES(this.oes.instance);
        }
        
        this.tessellator.resources.remove(this);
        this.disposed = true;
    }
}

Tessellator.Object.Buffer = function (value, dataType, type, readHint){
    this.value = value;
    this.dataType = dataType || Float32Array;
    this.type = type || Tessellator.ARRAY_BUFFER;
    this.readHint = readHint || Tessellator.STATIC;
    
    this.uploaded = false;
}

Tessellator.Object.Buffer.prototype.getLength = function (){
    return this.uploaded ? this.length : this.value.length;
}

Tessellator.Object.Buffer.prototype.subData = function (tessellator, value, off){
    if (off < 0){
        throw "offset is under 0";
    }else if (this.getLength() < value.length){
        throw "attributes can not increase in size: " + this.getLength() + " < " + value.length;
    }
    
    if (!this.uploaded){
        if (off !== 0){
            var c = this.value.combine(this.dataType);
            c.set(value.combine(this.dataType), off);
            
            this.value = new Tessellator.Array(c);
        }
    }else{
        var gl = tessellator.GL;
        
        gl.bindBuffer(tessellator.glConst(this.type), this.value);
        gl.bufferSubData(tessellator.glConst(this.type), off * Tessellator.Object.dataTypeSizes[this.dataType.name], value.combine(this.dataType));
    }
}

Tessellator.Object.Buffer.prototype.upload = function (tessellator){
    var gl = tessellator.GL;
    
    if (!this.uploaded && this.value.length){ 
        var buf = gl.createBuffer();
        gl.bindBuffer(tessellator.glConst(this.type), buf);
        gl.bufferData(tessellator.glConst(this.type), this.value.combine(this.dataType), tessellator.glConst(this.readHint));
        
        this.length = this.value.length;
        this.uploaded = true;
        this.value = buf;
    }
}

Tessellator.Object.Buffer.prototype.dispose = function (tessellator){
    if (this.uploaded && this.value){
        tessellator.GL.deleteBuffer(this.value);
        
        this.value = null;
    }
}

Tessellator.Object.dataTypes = {
    "Int8Array": "BYTE",
    "Uint8Array": "UNSIGNED_BYTE",
    "Int16Array": "SHORT",
    "Uint16Array": "UNSIGNED_SHORT",
    "Int32Array": "INT",
    "Uint32Array": "UNSIGNED_INT",
    "Int64Array": "LONG",
    "Uint64Array": "UNSIGNED_LONG",
    "Float32Array": "FLOAT",
    "Float64Array": "DOUBLE",
};

Tessellator.Object.dataTypeSizes = {
    "Int8Array": 1,
    "Uint8Array": 1,
    "Int16Array": 2,
    "Uint16Array": 2,
    "Int32Array": 4,
    "Uint32Array": 4,
    "Int64Array": 8,
    "Uint64Array": 8,
    "Float32Array": 4,
    "Float64Array": 8,
};

Tessellator.Object.registerTypeExtension = function (type, ext){
    Tessellator.Object.typeExtensions.push([type, ext]);
}

Tessellator.Object.getTypeExtension = function (type){
    for (var i = 0, k = Tessellator.Object.typeExtensions.length; i < k; i++){
        if (Tessellator.Object.typeExtensions[i][0] == type){
            return Tessellator.Object.typeExtensions[i][1];
        }
    }
}

Tessellator.Object.typeExtensions = [];/**
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


//strict mode can be used with this.
"use strict";

Tessellator.RenderMatrix = function (renderer, parent){
    this.uniforms = {};
    this.enabled = {};
    
    this.renderer = renderer;
    this.tessellator = renderer.tessellator;
    this.parent = parent;
    
    if (parent){
        this.copyMatrix(parent);
    }else{
        this.changes = {};
        
        this.index = 1;
        
        this.glBlendFunc = Tessellator.BLEND_DEFAULT;
        this.glDepthMask = 1;
        this.glDepthFunc = Tessellator.LEQUAL;
        this.glLineWidth = 1;
        
        this.enable(Tessellator.CULL_FACE);
        this.enable(Tessellator.DEPTH_TEST);
        this.enable(Tessellator.BLEND.gl);
        
        renderer.configure(this);
    }
}

Tessellator.RenderMatrix.prototype.MAX_INDEX = 1000000000;

Tessellator.RenderMatrix.prototype.copyMatrix = function (parent){
    for (var o in parent.uniforms){
        this.uniforms[o] = parent.uniforms[o];
    }
    
    for (var o in parent.enabled){
        this.enabled[o] = parent.enabled[o];
    }
    
    for (var o in this.changes){
        parent.changes[o] = this.changes[o];
    }
    
    this.changes = parent.changes;
    
    for (var i = 0, k = this.changes.length; i < k; i++){
        if (this.changes[i] > parent.index){
            this.changes[i] = this.MAX_INDEX;
        }
    }
    
    this.index = parent.index + 1;
    
    this.glBlendFunc = parent.glBlendFunc;
    this.glDepthMask = parent.glDepthMask;
    this.glDepthFunc = parent.glDepthFunc;
    this.glLineWidth = parent.glLineWidth;
}

Tessellator.RenderMatrix.prototype.dirty = function (item){
    if (item){
        this.changes[item] = this.MAX_INDEX;
    }else for (var o in this.changes){
        this.changes[o] = this.MAX_INDEX;
    }
}

Tessellator.RenderMatrix.prototype.exists = function (key){
    return this.renderer.shader.hasUniform(key);
}

Tessellator.RenderMatrix.prototype.set = function (key, value){
    this.dirty(key);
    
    this.uniforms[key] = value;
}

//new set. will not set if there is already a value
Tessellator.RenderMatrix.prototype.setn = function (key, value){
    if (!this.uniforms[key]){
        this.dirty(key);
        
        this.uniforms[key] = value;
    }
}

Tessellator.RenderMatrix.prototype.get = function (key){
    this.dirty(key);
    
    return this.gets(key);
}

//sneaky get. does not set the value dirty
Tessellator.RenderMatrix.prototype.gets = function (key){
    return this.uniforms[key];
}

Tessellator.RenderMatrix.prototype.unify = function (){
    var s = this.renderer.shader;
    var c = false;
    
    for (var o in this.uniforms){
        if (this.changes[o] > this.index){
            s.uniform(o, this.uniforms[o], this);
            
            this.changes[o] = this.index;
            
            c = true;
        }
    }
    
    if (c){
        s.unify(this);
    }
    
    this.unifyGLAttributes();
}

Tessellator.RenderMatrix.prototype.unifyAll = function (){
    var s = this.renderer.shader;
    
    for (var o in this.uniforms){
        s.uniform(o, this.uniforms[o], this);
        
        this.changes[o] = this.index;
    }
    
    s.unify(this);
    
    this.unifyGLAttributes();
}

Tessellator.RenderMatrix.prototype.unifyGLAttributes = function (){
    var t = this.tessellator;
    
    if (!this.changes.GL_BLEND_FUNC || this.changes.GL_BLEND_FUNC > this.index){
        t.GL.blendFunc(t.glConst(this.glBlendFunc[0]), t.glConst(this.glBlendFunc[1]));
        
        this.changes.GL_BLEND_FUNC = this.index;
    }
    
    if (!this.changes.GL_DEPTH_MASK || this.changes.GL_DEPTH_MASK > this.index){
        t.GL.depthMask(t.glConst(this.glDepthMask));
        
        this.changes.GL_DEPTH_MASK = this.index;
    }
    
    if (!this.changes.GL_DEPTH_FUNC || this.changes.GL_DEPTH_FUNC > this.index){
        t.GL.depthFunc(t.glConst(this.glDepthFunc));
        
        this.changes.GL_DEPTH_FUNC = this.index;
    }
    
    if (!this.changes.GL_LINE_WIDTH || this.changes.GL_LINE_WIDTH > this.index){
        t.GL.lineWidth(this.glLineWidth);
        
        this.changes.GL_LINE_WIDTH = this.index;
    }
    
    for (var o in this.enabled){
        if (this.changes[o] > this.index){
            if (this.enabled[o]){
                t.GL.enable(o);
            }else{
                t.GL.disable(o);
            }
            
            this.changes[o] = this.index;
        }
    }
}

Tessellator.RenderMatrix.prototype.has = function (key){
    if (this.uniforms[key] !== undefined){
        return true;
    }else{
        return false;
    }
}

Tessellator.RenderMatrix.prototype.blendFunc = function (value){
    this.glBlendFunc = value;
    
    this.dirty("GL_BLEND_FUNC");
}

Tessellator.RenderMatrix.prototype.depthMask = function (value){
    this.glDepthMask = value;
    
    this.dirty("GL_DEPTH_MASK");
}

Tessellator.RenderMatrix.prototype.depthFunc = function (value){
    this.glDepthFunc = value;
    
    this.dirty("GL_DEPTH_FUNC");
}

Tessellator.RenderMatrix.prototype.lineWidth = function (value){
    this.glLineWidth = value;
    
    this.dirty("GL_LINE_WIDTH");
}

Tessellator.RenderMatrix.prototype.isEnabled = function (value){
    return this.enabled[this.tessellator.glConst(value)];
}

Tessellator.RenderMatrix.prototype.enable = function (value){
    value = this.tessellator.glConst(value);
    
    this.enabled[value] = true;
    this.dirty(value);
}

Tessellator.RenderMatrix.prototype.disable = function (value){
    value = this.tessellator.glConst(value);
    
    this.enabled[value] = false;
    this.dirty(value);
}

Tessellator.RenderMatrix.prototype.copy = function (renderer) {
    if (renderer){
        var copy = new Tessellator.RenderMatrix(renderer);
        copy.copyMatrix(this);
        
        return copy;
    }else{
        return new Tessellator.RenderMatrix(this.renderer, this);
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.RendererAbstract = function (shader){
    if (!shader){
        this.tessellator = null;
    }else if (shader.constructor === Tessellator){
        this.tessellator = shader;
    }else{
        this.tessellator = shader.tessellator;
        this.shader = shader;
    }
    
    this.startTime = Date.now();
}

Tessellator.RendererAbstract.prototype.setShader = function (shader){
    if (!this.tessellator || shader.tessellator === this.tessellator){
        this.tessellator = shader.tessellator;
        this.shader = shader;
    }else{
        throw "incompatible shader";
    }
    
    return this;
}

Tessellator.RendererAbstract.prototype.render = function (matrix, arg){
    if (!matrix){
        this.preRender();
        this.render(new Tessellator.RenderMatrix(this), arg);
        this.postRender();
    }else if (this.init(matrix, arg)){
        this.renderRaw(matrix, arg);
    }
}

Tessellator.RendererAbstract.prototype.setUniformSetter = function (setter){
    this.uniformSetter = setter;
    
    return this;
}

Tessellator.RendererAbstract.prototype.init = function (){
    return this.shader;
}

Tessellator.RendererAbstract.prototype.configure = function (matrix){
    if (this.shader){
        this.shader.setInheriter("window", Tessellator.Program.UNIFY_WINDOW);
        
        matrix.setn("window", Tessellator.vec2(this.tessellator.width, this.tessellator.height));
        matrix.setn("time", (Date.now() - this.startTime) / 1000);
        
        if (this.uniformSetter){
            this.uniformSetter(matrix);
        }
    }
}

Tessellator.RendererAbstract.prototype.preRender = function (){
    this.tessellator.preRender();
}

Tessellator.RendererAbstract.prototype.postRender = function (){
    this.tessellator.postRender();
}

Tessellator.RendererAbstract.prototype.renderRaw = function (){
    throw "abstract function not extended";
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.FullScreenRenderer = function (shader){
    this.super(shader);
    
    this.object = new Tessellator.Object(this.tessellator, Tessellator.TRIANGLE);
    
    this.object.setAttribute("position", Tessellator.VEC2, new Tessellator.Array([
        -1, -1,
        1, -1,
        1, 1,
        -1, 1
    ]), Int8Array);
    
    this.object.resetIndices(Uint8Array);
    
    this.object.getIndices().push([
        0, 1, 2,
        0, 2, 3
    ]);
    
    this.object.upload();
    this.object.useOES();
}

Tessellator.copyProto(Tessellator.FullScreenRenderer, Tessellator.RendererAbstract);

Tessellator.FullScreenRenderer.prototype.setAspect = function(aspect){
    this.aspect = aspect;
    
    return this;
}

Tessellator.FullScreenRenderer.prototype.unifyAspect = function (matrix){
    if (this.aspect){
        var g = !isNaN(this.aspect);
        
        if (!g){
            if (!isNaN(this.aspect.getAspect())){
                g = this.aspect.getAspect();
            }
        }else{
            g = this.aspect;
        }
        
        if (g){
            var window = matrix.get("window");
            var currentAspect = window[0] / window[1];
            
            var aspect = Tessellator.vec2(
                Math.min(0, g / currentAspect - 1), 
                Math.min(0, currentAspect / g - 1)
            );
            
            matrix.set("aspect", aspect);
        }else{
            matrix.set("aspect", Tessellator.vec2());
        }
    }else{
        matrix.set("aspect", Tessellator.vec2());
    }
}

Tessellator.FullScreenRenderer.prototype.renderRaw = function (matrix){
    this.unifyAspect(matrix);
    
    matrix.disable(Tessellator.DEPTH_TEST);
    
    this.object.render(matrix);
}/**
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
 

//strict mode can be used with this.
"use strict";

Tessellator.FullScreenTextureRenderer = function (shader){
    this.super(shader);
    
    if (arguments.length > 1){
        this.textures = Array.prototype.slice.call(arguments, 1, arguments.length);
    }
}

Tessellator.copyProto(Tessellator.FullScreenTextureRenderer, Tessellator.FullScreenRenderer);

Tessellator.FullScreenTextureRenderer.prototype.setTextures = function (textures){
    this.textures = textures;
    
    return this;
}

Tessellator.FullScreenTextureRenderer.prototype.setResolutionScale = function (res){
    if (isNaN(res)){
        this.res = res;
    }else{
        this.res = Tessellator.vec2(res);
    }
}

Tessellator.FullScreenTextureRenderer.prototype.setRenderer = function (renderer){
    this.rendererAttachment.renderer = renderer;
}

Tessellator.FullScreenTextureRenderer.prototype.renderRaw = function (render, arg){
    var textures = this.textures;
    
    if (!textures && arg){
        if (arg.constructor === Array){
            textures = arg;
        }else{
            textures = [ arg ];
        }
    }
    
    if (textures){
        for (var i = 0; i < textures.length; i++){
            if (i === 0){
                render.set("sampler", textures[0]);
            }else{
                render.set("sampler" + (i + 1).toString(), textures[i]);
            }
        }
        
        this.super.renderRaw(render, arg);
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.FillRenderer = function (renderer){
    this.color = Tessellator.getColor(Array.prototype.slice.call(arguments, 1, arguments.length));
    this.renderer = renderer;
    
    this.super(renderer.tessellator.createPixelShader(Tessellator.PIXEL_SHADER_COLOR));
}

Tessellator.extend(Tessellator.FillRenderer, Tessellator.FullScreenRenderer);

Tessellator.FillRenderer.prototype.renderRaw = function (render, arg){
    render.set("color", this.color);
    
    this.super.renderRaw(render);
    
    var newrender = new Tessellator.RenderMatrix(this.renderer);
    newrender.set("window", render.gets("window"));
    
    this.renderer.render(newrender, arg);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.BufferedRenderer = function (shader, renderer, res, bufferAttachments){
    if (shader.constructor === String){
        shader = renderer.tessellator.createPixelShader(shader);
    }else if (shader.constructor === Tessellator){
        shader = shader.createPixelShader(Tessellator.PIXEL_SHADER_PASS);
    }else if (shader.constructor === Tessellator.ShaderPreset){
        shader = renderer.tessellator.createPixelShader(shader);
    }else if (shader.constructor !== Tessellator.Program){
        bufferAttachments = res;
        res = renderer;
        renderer = shader;
        
        shader = shader.tessellator.createPixelShader(Tessellator.PIXEL_SHADER_PASS);
    }
    
    this.super(shader);
    
    this.rendererAttachment = new Tessellator.TextureModel.AttachmentRenderer(renderer);
    this.res = Tessellator.vec2(res || 1);
    
    this.bufferAttachments = bufferAttachments;
    
    if (this.bufferAttachments && this.bufferAttachments !== true){
        this.bufferAttachments.push(this.rendererAttachment);
    }else{
        var includeDepth = this.bufferAttachments;
        
        this.bufferAttachments = [
            new Tessellator.TextureModel.AttachmentColor(),
            this.rendererAttachment,
        ]
        
        if (includeDepth){
            this.bufferAttachments.push(new Tessellator.TextureModel.AttachmentDepth());
        }
    }
}

Tessellator.copyProto(Tessellator.BufferedRenderer, Tessellator.FullScreenRenderer);

Tessellator.BufferedRenderer.prototype.setResolutionScale = function (res){
    if (isNaN(res)){
        this.res = res;
    }else{
        this.res = Tessellator.vec2(res);
    }
}

Tessellator.BufferedRenderer.prototype.setRenderer = function (renderer){
    this.rendererAttachment.renderer = renderer;
}

Tessellator.BufferedRenderer.prototype.renderRaw = function (render, arg){
    if (this.rendererAttachment.renderer){
        this.unifyAspect(render);
        
        var window = render.gets("window");
        var aspect = render.gets("aspect");
        
        if (!aspect){
            aspect = Tessellator.vec2(1);
        }
        
        if (!this.buffer){
            this.buffer = new Tessellator.TextureModel(this.tessellator,
                window[0] * this.res[0] * (aspect[0] + 1),
                window[1] * this.res[1] * (aspect[1] + 1),
                this.bufferAttachments);
            
            this.buffer.autoUpdate = false;
        }else{
            this.buffer.setSize(
                window[0] * this.res[0] * (aspect[0] + 1),
                window[1] * this.res[1] * (aspect[1] + 1)
            );
        }
        
        this.rendererAttachment.arg = arg;
        
        this.buffer.render(render);
        render.set("sampler", this.buffer);
        
        render.disable(Tessellator.BLEND);
        render.disable(Tessellator.DEPTH_TEST);
    
        this.object.render(render);
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.ModelRenderer = function (){
    if (arguments.length === 1){
        var arg = arguments[0];
        
        if (arg.type === Tessellator.MODEL){
            if (!Tessellator.ModelRenderer.defaultShader){
                Tessellator.ModelRenderer.defaultShader = Tessellator.MODEL_VIEW_FRAGMENT_LIGHTING_SHADER.create(arg.tessellator);
            }
            
            this.super(Tessellator.ModelRenderer.defaultShader);
            
            this.model = arg;
        }else if (arg.constructor === Tessellator){
            if (!Tessellator.ModelRenderer.defaultShader){
                Tessellator.ModelRenderer.defaultShader = Tessellator.MODEL_VIEW_FRAGMENT_LIGHTING_SHADER.create(arg);
            }
            
            this.super(Tessellator.ModelRenderer.defaultShader);
        }else{
            this.super(arg);
        }
    }else if (arguments.length === 2){
        var arg = arguments[0];
        
        if (arg.constructor === Tessellator){
            if (!Tessellator.ModelRenderer.defaultShader){
                Tessellator.ModelRenderer.defaultShader = Tessellator.MODEL_VIEW_FRAGMENT_LIGHTING_SHADER.create(arg);
            }
            this.super(Tessellator.ModelRenderer.defaultShader);
        }else{
            this.super(arg);
        }
        
        this.model = arguments[1];
    }else{
        this.super();
    }
    
    this.noLightingTexture = new Tessellator.TextureData(this.tessellator, 1, 1, Tessellator.RGBA, Tessellator.UNSIGNED_BYTE, new Uint8Array([0, 255, 255, 255]));
    this.lightingTexture = new Tessellator.TextureData(this.tessellator, 4, 256, Tessellator.RGBA, Tessellator.FLOAT);
}

Tessellator.extend(Tessellator.ModelRenderer, Tessellator.RendererAbstract);

Tessellator.ModelRenderer.prototype.setLighting = function (model, matrix, index){
    var lighting = false;
    
    if (!matrix){
        matrix = Tessellator.mat4();
        var float = Tessellator.float();
        
        lighting = this.setLighting(model, matrix, float);
        this.lightingTexture.data.set(Tessellator.vec4(), float[0] * 4 * 4);
    }else{
        for (var i = 0, k = model.model.length; i < k; i++){
            var action = model.model[i];
            
            if (action.applyLighting && action.applyLighting(matrix, index, this)){
                lighting = true;
            }
        }
    }
    
    return lighting;
}

Tessellator.ModelRenderer.prototype.configure = function (matrix){
    this.shader.setInheriter("mvMatrix", Tessellator.Program.MV_MATRIX_UNIFY_FUNC);
    
    matrix.set("mvMatrix", Tessellator.mat4());
    matrix.set("mask", Tessellator.vec4(1, 1, 1, 1));
    matrix.set("clip", Tessellator.NO_CLIP);
    matrix.set("lights", this.noLightingTexture);
    matrix.set("specular", 0);
    
    this.super.configure(matrix);
}

Tessellator.ModelRenderer.prototype.init = function (matrix, model){
    model = model || this.model;
    
    if (!this.super.init(matrix, model) || !model.render){
        return false;
    }
    
    if (this.setLighting(model)){
        this.lightingTexture.update();
    }
    
    return true;
}

Tessellator.ModelRenderer.prototype.renderRaw = function (matrix, model){
    this.renderModel(matrix, model || this.model);
}

Tessellator.ModelRenderer.prototype.renderModel = function (matrix, model){
    if (model) for (var i = 0, k = model.model.length; i < k; i++){
        var mod = model.model[i];
        
        if (mod.apply){
            mod.apply(matrix, model, this);
        }
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.ModelCubeRenderer = function (shader, model, pos){
    this.super(shader);
    
    this.model = model;
    this.pos = pos;
}

Tessellator.extend(Tessellator.ModelCubeRenderer, Tessellator.ModelRenderer);

Tessellator.ModelCubeRenderer.prototype.init = function (matrix){
    return this.super.init(matrix, this.model);
}

Tessellator.ModelCubeRenderer.prototype.renderRaw = function (matrix, side){
    var mat = matrix.get("mvMatrix");
    mat.translate(this.pos);
    
    var up;
    
    if (side[1] === 1){
        side = Tessellator.vec3(0, 1, 0);
        up = Tessellator.vec3(0, 0, -1);
    }else if (side[1] === -1){
        side = Tessellator.vec3(0, -1, 0);
        up = Tessellator.vec3(0, 0, 1);
    }else{
        up = Tessellator.vec3(0, 1, 0);
    }
    
    mat.rotateVec(side, up);
    
    this.renderModel(matrix, this.model);
}/**
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

Tessellator.PixelShaderRenderer = Tessellator.BufferedRenderer;/**
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


//strict mode can be used with this.
"use strict";

Tessellator.AtlasAnimationRenderer = function (shader){
    this.super(shader);
    
    this.buffer = new Tessellator.Array(new Float32Array(8));
    
    this.object.setAttribute("textureCoord", Tessellator.VEC2, this.buffer, Float32Array, false, Tessellator.DYNAMIC);
    this.object.upload();
}

Tessellator.copyProto(Tessellator.AtlasAnimationRenderer, Tessellator.FullScreenRenderer);

Tessellator.AtlasAnimationRenderer.prototype.renderRaw = function (render, texture){
    render.set("sampler", texture.src);
    
    var gl = this.tessellator.GL;
    
    var frame = texture.frame;
    var frames = texture.frames;
    
    if (texture.src.width === texture.size){
        this.buffer.set(0, 0);
        this.buffer.set(2, 1);
        this.buffer.set(4, 1);
        this.buffer.set(6, 0);
        
        this.buffer.set(1, frame / frames);
        this.buffer.set(3, frame / frames);
        this.buffer.set(5, (frame + 1) / frames);
        this.buffer.set(7, (frame + 1) / frames);
    }else{
        this.buffer.set(1, 0);
        this.buffer.set(3, 1);
        this.buffer.set(5, 1);
        this.buffer.set(7, 0);
        
        this.buffer.set(0, frame / frames);
        this.buffer.set(2, frame / frames);
        this.buffer.set(4, (frame + 1) / frames);
        this.buffer.set(6, (frame + 1) / frames);
    }
    
    this.object.setAttributeData("textureCoord", this.buffer);
    
    render.disable(gl.BLEND);
    render.disable(gl.DEPTH_TEST);
    
    this.object.render(render);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.AtlasRenderer = function (tessellator){
    this.super(Tessellator.ATLAS_SHADER.create(tessellator));
}

Tessellator.copyProto(Tessellator.AtlasRenderer, Tessellator.FullScreenRenderer);

Tessellator.AtlasRenderer.prototype.NO_MASK = Tessellator.vec4(1, 1, 1, 1);

Tessellator.AtlasRenderer.prototype.renderRaw = function (render, atlas){
    var gl = this.tessellator.GL;
    
    render.blendFunc(Tessellator.BLEND_DEFAULT);
    render.disable(gl.BLEND);
    
    render.set("atlasDims", Tessellator.vec2(atlas.atlas.length, atlas.atlas[0].length));
    
    for (var i = 0; i < atlas.updateCache.length; i++){
        var textures = atlas.updateCache[i];
        var ii;
        
        render.set("atlas", textures.pos);
        
        for (ii = 0; ii < textures.length; ii++){
            var texture = textures[ii];
            
            if (texture.mask){
                render.set("mask", texture.mask);
            }else{
                render.set("mask", this.NO_MASK);
            }
            
            if (ii > 0){
                render.enable(gl.BLEND);
            }
            
            render.set("sampler", texture.texture);
            this.super.renderRaw(render);
        }
        
        if (ii > 1){
            render.disable(gl.BLEND);
        }
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.QueuedRenderer = function (){
    this.setQueue(arguments);
}

Tessellator.extend(Tessellator.QueuedRenderer, Tessellator.RendererAbstract);

Tessellator.QueuedRenderer.prototype.setQueue = function (){
    if (arguments.length === 1){
        if (arguments[0].length){
            this.queue = arguments[0];
        }else{
            this.queue = arguments;
        }
    }else{
        this.queue = arguments;
    }
    
    for (var i = 0; i < this.queue.length; i++){
        if (this.queue[i].tessellator){
            this.tessellator = this.queue[i].tessellator;
            break;
        }
    }
}

Tessellator.QueuedRenderer.prototype.setAspect = function(aspect){
    for (var i = 0; i < this.queue.length; i++){
        if (this.queue[i].setAspect){
            this.queue[i].setAspect(aspect);
        }
    }
    
    return this;
}

Tessellator.QueuedRenderer.prototype.init = function (){
    return this.queue;
}

Tessellator.QueuedRenderer.prototype.renderRaw = function (matrix, arg){
    for (var i = 0; i < this.queue.length; i++){
        this.queue[i].render(matrix.copy(this.queue[i]), arg);
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Initializer = function (tessellator, inheritFrom){
    this.tessellator = tessellator;
    
    this.model = [];
    this.finished = false;
    
    this.attribs = {};
    
    if (inheritFrom){
        for (var o in inheritFrom.attribs){
            this.attribs[o] = inheritFrom.attribs[o];
        }
    }else{
        for (var o in Tessellator.Initializer.defaults){
            this.attribs[o] = Tessellator.Initializer.defaults[o](this);
        }
    }
}

Tessellator.Initializer.prototype.get = function (key){
    return this.attribs[key];
}

Tessellator.Initializer.prototype.getr = function (key){
    var value = this.attribs[key];
    this.attribs[key] = null;
    
    return value;
}

Tessellator.Initializer.prototype.getd = function (key, def){
    var value = this.attribs[key];
    
    if (!value){
        value = def;
        
        this.attribs[key] = value;
    }
    
    return value;
}

Tessellator.Initializer.prototype.set = function (key, value){
    return this.attribs[key] = value;
}

Tessellator.Initializer.defaults = {};

Tessellator.Initializer.setDefault = function (key, value){
    Tessellator.Initializer.defaults[key] = value;
}

Tessellator.Initializer.prototype.push = function (action){
    if (action.init){
        var push = action.init(this);
        
        if (push !== null){
            if (push){
                this.model.push(push);
            }else{
                this.model.push(action);
            }
        }
        
        return push;
    }else{
        this.model.push(action);
    }
}


Tessellator.Initializer.prototype.finish = function (){
    this.flush();
    
    for (var i = 0; i < this.model.length; i++){
        if (this.model[i].postInit){
            this.model[i].postInit(this);
        }
    }
    
    return this.model;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.prototype.renderModel = function (model, renderer){
    model.renderModel(renderer);
}

Tessellator.prototype.createModel = function (renderer){
    return new Tessellator.Model(this, renderer);
}

Tessellator.prototype.createMatrix = Tessellator.prototype.createModel;

Tessellator.Model = function (tessellator, renderer){
    this.type = Tessellator.MODEL;
    
    this.render = false;
    this.disposable = true;
    this.disposed = false;
    this.renderer = renderer;
    
    this.tessellator = tessellator;
    
    this.matrixStack = [ this ];
}

Tessellator.Model.prototype.renderModel = function (renderer){
    if (!renderer){
        if (this.renderer){
            renderer = this.renderer;
        }else{
            if (!this.tessellator.defaultRenderer){
                this.tessellator.defaultRenderer = new Tessellator.ModelRenderer(this.tessellator);
            }
            
            renderer = this.tessellator.defaultRenderer;
        }
    }
    
    renderer.render(null, this);
}

Tessellator.Model.prototype.remove = function (obj){
    if (this.model){
        if (!isNaN(obj)){
            this.model.splice(obj, 1)
        }else{
            if (!obj && this.parent){
                this.parent.remove(this);
            }else{
                this.model.splice(this.model.indexOf(obj), 1);
            }
        }
    }
}

Tessellator.Model.prototype.apply = function (matrix, mod, renderer){
    if (this.render){
        var copy = matrix.copy(renderer || this.renderer);
        copy.set("mvMatrix", matrix.gets("mvMatrix").clone());
        
        if (this.renderer){
            this.renderer.render(copy, this);
        }else{
            renderer.renderRaw(copy, this);
        }
    }
}

Tessellator.Model.prototype.applyLighting = function (matrix, index, renderer){
    if (this.render && !this.renderer){
        return renderer.setLighting(this, matrix.clone(), index);
    }
}

Tessellator.Model.prototype.init = function (interpreter){
    interpreter.flush();
}

Tessellator.Model.prototype.push = function (renderer){
    var matrix = new Tessellator.Model(this.tessellator, renderer);
    matrix.parent = this.matrixStack[this.matrixStack.length - 1];
    
    this.add(matrix);
    this.matrixStack.push(matrix);
    
    return matrix;
}

Tessellator.Model.prototype.pop = function () {
    if (this.matrixStack.length <= 1){
        throw "cannot pop from a empty matrix stack!";
    }
    
    return this.matrixStack.pop().update();
}


Tessellator.Model.prototype.createModel = function (renderer) {
    var matrix = new Tessellator.Model(this.tessellator, renderer);
    matrix.parent = this;
    
    this.add(matrix);
    
    return matrix;
}

Tessellator.Model.prototype.createMatrix = Tessellator.Model.prototype.createModel;

Tessellator.Model.prototype.configureDrawing = function (){
    var matrix = this.matrixStack[this.matrixStack.length - 1];
    
    if (!matrix.isDrawing()){
        matrix.disposeShallow();
        this.disposed = false;
        
        matrix.actions = new Tessellator.Initializer(matrix.tessellator, matrix.parent ? matrix.parent.actions : null);
    }
}

Tessellator.Model.prototype.add = function (action){
    if (!action){
        throw "null pointer";
    }
    
    this.configureDrawing();
    
    this.matrixStack[this.matrixStack.length - 1].actions.push(action);
    return action;
}

Tessellator.Model.prototype.isDrawing = function (){
    return this.actions && this.actions.constructor === Tessellator.Initializer;
}

Tessellator.Model.prototype.finish = function (){
    if (this.matrixStack.length > 1){
        throw "cannot finish a model with items in the matrixStack!";
    }
    
    this.disposed = false;
    
    if (this.isDrawing()){
        this.model = this.actions.finish();
        this.actions = {
            attribs: this.actions.attribs
        };
        
        this.render = true;
    }else{
        this.model = null;
        
        this.render = false;
    }
    
    return this;
}

//for compatibility
Tessellator.Model.prototype.update = Tessellator.Model.prototype.finish;


Tessellator.Model.prototype.dispose = function (){
    this.render = false;
    
    if (this.model){
        this.disposed = true;
        
        for (var i = 0, k = this.model.length; i < k; i++){
            var mod = this.model[i];
            
            if (mod.disposable){
                mod.dispose();
            }
        }
        
        this.model = null;
    }
    
    this.remove();
}

Tessellator.Model.prototype.disposeShallow = function (){
    this.render = false;
    this.disposed = true;
    
    if (this.model){
        for (var i = 0, k = this.model.length; i < k; i++){
            var mod = this.model[i];
            
            if (mod.type !== Tessellator.MODEL && mod.type !== Tessellator.MODEL_FRAGMENT){
                if (mod.disposable){
                    if (mod.disposable){
                        mod.dispose();
                    }
                }
            }
        }
        
        this.model = null;
    }
    
    this.remove();
}

Tessellator.Model.prototype.createTexture = function (width, height, filter, renderer){
    return new Tessellator.TextureModel(this.tessellator, width, height, [
        new Tessellator.TextureModel.AttachmentColor(filter),
        new Tessellator.TextureModel.AttachmentDepth(),
        new Tessellator.TextureModel.AttachmentModel(this, renderer)
    ]);
}

Tessellator.Model.prototype.countRenderItems = function (){
    var count = 0;
    
    if (this.model){
        for (var i = 0, k = this.model.length; i < k; i++){
            if (this.model[i].type === Tessellator.MODEL){
                if (this.model[i].render){
                    count += this.model[i].countRenderItems();
                }
            }
            
            count++;
        }
    }
    
    return count;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.createFragment = function (){
    var model;
    
    if (this.matrixStack.length){
        model = this.matrixStack[this.matrixStack.length - 1];
    }else{
        model = this;
    }
    
    return this.add(new Tessellator.Model.Fragment(model));
}

Tessellator.Model.Fragment = function (model){
    this.super(model.tessellator, model.renderer);
    
    this.parent = model;
    this.type = Tessellator.MODEL_FRAGMENT;
}

Tessellator.copyProto(Tessellator.Model.Fragment, Tessellator.Model);

Tessellator.Model.Fragment.prototype.apply = function (matrix, mod, renderer){
    if (this.render){
        renderer.render(matrix, this);
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.drawRect = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            w = arguments[2],
            h = arguments[3];
        
        this.start(Tessellator.LINE);
        this.setVertex(
            x, y, 0,
            x + w, y, 0,
            x, y + h, 0,
            x + w, y + h, 0
        );
        this.end([0, 1, 0, 2, 3, 1, 3, 2]);
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            w = arguments[2],
            h = arguments[3],
            vec = arguments[4];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.LINE);
        this.setVertex(Tessellator.vec3(x, 0, y).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, 0, y).multiply(mat));
        this.setVertex(Tessellator.vec3(x, 0, y + h).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, 0, y + h).multiply(mat));
        this.end([0, 1, 0, 2, 3, 1, 3, 2]);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            h = arguments[4],
            vec = arguments[5];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.LINE);
        this.setVertex(Tessellator.vec3(x, z, y).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, z, y).multiply(mat));
        this.setVertex(Tessellator.vec3(x, z, y + h).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, z, y + h).multiply(mat));
        this.end([0, 1, 0, 2, 3, 1, 3, 2]);
    }
}

Tessellator.Model.prototype.fillRect = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            w = arguments[2],
            h = arguments[3];
        
        this.start(Tessellator.QUAD);
        this.setVertex(
            x, y, 0,
            x + w, y, 0,
            x + w, y + h, 0,
            x, y + h, 0
        );
        this.end();
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            w = arguments[2],
            h = arguments[3],
            vec = arguments[4];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, -1, 0));
        
        this.start(Tessellator.QUAD);
        this.setVertex(Tessellator.vec3(x, 0, y).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, 0, y).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, 0, y + h).multiply(mat));
        this.setVertex(Tessellator.vec3(x, 0, y + h).multiply(mat));
        this.end();
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            h = arguments[4],
            vec = arguments[5];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, -1, 0));
        
        this.start(Tessellator.QUAD);
        this.setVertex(Tessellator.vec3(x, z, y).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, z, y).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, z, y + h).multiply(mat));
        this.setVertex(Tessellator.vec3(x, z, y + h).multiply(mat));
        this.end();
    }
}

Tessellator.Model.prototype.drawCuboid = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3] / 2;
        
        this.start(Tessellator.LINE);
        this.setVertex(
            x - w, y - w, z - w,
            x + w, y - w, z - w,
            x - w, y + w, z - w,
            x + w, y + w, z - w,
            x - w, y - w, z + w,
            x + w, y - w, z + w,
            x - w, y + w, z + w,
            x + w, y + w, z + w
        );
        this.end([0, 1, 0, 2, 0, 4, 7, 3, 7, 6, 7, 5, 3, 2, 3, 1, 4, 5, 4, 6, 5, 1, 6, 2]);
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3] / 2,
            vec = arguments[4];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.LINE);
        this.setVertex(Tessellator.vec3(x - w, y - w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y - w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w, y + w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y + w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w, y - w, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y - w, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w, y + w, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y + w, z + w).multiply(mat));
        this.end([0, 1, 0, 2, 0, 4, 7, 3, 7, 6, 7, 5, 3, 2, 3, 1, 4, 5, 4, 6, 5, 1, 6, 2]);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5];
        
        this.start(Tessellator.LINE);
        this.setVertex(
            x , y , z ,
            xx, y , z ,
            x , yy, z ,
            xx, yy, z ,
            x , y , zz,
            xx, y , zz,
            x , yy, zz,
            xx, yy, zz
        );
        this.end([0, 1, 0, 2, 0, 4, 7, 3, 7, 6, 7, 5, 3, 2, 3, 1, 4, 5, 4, 6, 5, 1, 6, 2]);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5],
            vec = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.LINE);
        this.setVertex(Tessellator.vec3(x , y , z ).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y , z ).multiply(mat));
        this.setVertex(Tessellator.vec3(x , yy, z ).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, yy, z ).multiply(mat));
        this.setVertex(Tessellator.vec3(x , y , zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y , zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x , yy, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, yy, zz).multiply(mat));
        this.end([0, 1, 0, 2, 0, 4, 7, 3, 7, 6, 7, 5, 3, 2, 3, 1, 4, 5, 4, 6, 5, 1, 6, 2]);
    }
}

Tessellator.Model.prototype.fillCuboid = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3] / 2;
        
        this.start(Tessellator.QUAD);
        this.setVertex(
            x - w, y - w, z + w,
            x + w, y - w, z + w,
            x + w, y + w, z + w,
            x - w, y + w, z + w,
            
            x + w, y - w, z - w,
            x - w, y - w, z - w,
            x - w, y + w, z - w,
            x + w, y + w, z - w,
            
            x - w, y - w, z - w,
            x - w, y - w, z + w,
            x - w, y + w, z + w,
            x - w, y + w, z - w,
            
            x + w, y - w, z + w,
            x + w, y - w, z - w,
            x + w, y + w, z - w,
            x + w, y + w, z + w,
            
            x - w, y + w, z + w,
            x + w, y + w, z + w,
            x + w, y + w, z - w,
            x - w, y + w, z - w,
            
            x - w, y - w, z - w,
            x + w, y - w, z - w,
            x + w, y - w, z + w,
            x - w, y - w, z + w
        );
        this.end();
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3] / 2,
            vec = arguments[4];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.QUAD);
        this.setVertex(Tessellator.vec3(x - w, y - w, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y - w, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y + w, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w, y + w, z + w).multiply(mat));
        
        this.setVertex(Tessellator.vec3(x + w, y - w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w, y - w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w, y + w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y + w, z - w).multiply(mat));
        
        this.setVertex(Tessellator.vec3(x - w, y - w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w, y - w, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w, y + w, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w, y + w, z - w).multiply(mat));
            
        this.setVertex(Tessellator.vec3(x + w, y - w, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y - w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y + w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y + w, z + w).multiply(mat));
            
        this.setVertex(Tessellator.vec3(x - w, y + w, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y + w, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y + w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w, y + w, z - w).multiply(mat));
            
        this.setVertex(Tessellator.vec3(x - w, y - w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y - w, z - w).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w, y - w, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w, y - w, z + w).multiply(mat));
        this.end();
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5];
        
        this.start(Tessellator.QUAD);
        this.setVertex(
            x, y, zz,
            xx, y, zz,
            xx, yy, zz,
            x, yy, zz,
            
            xx, y, z,
            x, y, z,
            x, yy, z,
            xx, yy, z,
            
            x, y, z,
            x, y, zz,
            x, yy, zz,
            x, yy, z,
            
            xx, y, zz,
            xx, y, z,
            xx, yy, z,
            xx, yy, zz,
            
            x, yy, zz,
            xx, yy, zz,
            xx, yy, z,
            x, yy, z,
            
            x, y, z,
            xx, y, z,
            xx, y, zz,
            x, y, zz
        );
        this.end();
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5],
            vec = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.QUAD);
        this.setVertex(Tessellator.vec3(x, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, yy, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x, yy, zz).multiply(mat));
        
        this.setVertex(Tessellator.vec3(xx, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, yy, z).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, yy, z).multiply(mat));
        
        this.setVertex(Tessellator.vec3(x, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x, yy, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x, yy, z).multiply(mat));
            
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, yy, z).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, yy, zz).multiply(mat));
            
        this.setVertex(Tessellator.vec3(x, yy, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, yy, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, yy, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, yy, z).multiply(mat));
            
        this.setVertex(Tessellator.vec3(x, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, zz).multiply(mat));
        this.end();
    }
}

Tessellator.Model.prototype.fillCube = Tessellator.Model.prototype.fillCuboid;

Tessellator.Model.prototype.drawCube = Tessellator.Model.prototype.drawCuboid;

Tessellator.Model.prototype.drawPrism = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3];
        
        this.start(Tessellator.LINE);
        this.setVertex(
            x - w / 2, y - w / 2, z - w / 2,
            x + w / 2, y - w / 2, z - w / 2,
            x - w / 2, y - w / 2, z + w / 2,
            x + w / 2, y - w / 2, z + w / 2,
            x, y + w / 2, z + w / 2,
            x, y + w / 2, z - w / 2
        );
        this.end([0, 1, 0, 2, 3, 2, 3, 1, 0, 5, 1, 5, 2, 4, 3, 4, 4, 5]);
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            vec = arguments[4];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.LINE);
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z - w / 2).multiply(mat));
        this.end([0, 1, 0, 2, 3, 2, 3, 1, 0, 5, 1, 5, 2, 4, 3, 4, 4, 5]);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5];
        
        var dx = (x + xx) / 2;
        
        this.start(Tessellator.LINE);
        this.setVertex(
            x , y , z ,
            xx, y , z ,
            x , y , zz,
            xx, y , zz,
            dx, yy, zz,
            dx, yy, z
        );
        this.end([0, 1, 0, 2, 3, 2, 3, 1, 0, 5, 1, 5, 2, 4, 3, 4, 4, 5]);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5],
            vec = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        var dx = (x + xx) / 2;
        
        this.start(Tessellator.LINE);
        this.setVertex(Tessellator.vec3(x, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, z).multiply(mat));
        this.end([0, 1, 0, 2, 3, 2, 3, 1, 0, 5, 1, 5, 2, 4, 3, 4, 4, 5]);
    }
}

Tessellator.Model.prototype.fillPrism = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3];
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(
            x + w / 2, y - w / 2, z - w / 2,
            x - w / 2, y - w / 2, z - w / 2,
            x, y + w / 2, z - w / 2,
            
            x - w / 2, y - w / 2, z + w / 2,
            x + w / 2, y - w / 2, z + w / 2,
            x, y + w / 2, z + w / 2
        );
        this.end();
        
        this.start(Tessellator.QUAD);
        this.setVertex(
            x + w / 2, y - w / 2, z + w / 2,
            x - w / 2, y - w / 2, z + w / 2,
            x - w / 2, y - w / 2, z - w / 2,
            x + w / 2, y - w / 2, z - w / 2,
            
            x + w / 2, y - w / 2, z + w / 2,
            x + w / 2, y - w / 2, z - w / 2,
            x, y + w / 2, z - w / 2,
            x, y + w / 2, z + w / 2,
            
            x - w / 2, y - w / 2, z - w / 2,
            x - w / 2, y - w / 2, z + w / 2,
            x, y + w / 2, z + w / 2,
            x, y + w / 2, z - w / 2
        );
        this.end();
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            vec = arguments[4];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z + w / 2).multiply(mat));
        this.end();
        
        this.start(Tessellator.QUAD);
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z - w / 2).multiply(mat));
        this.end();
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5];
        
        var dx = (x + xx) / 2;
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(
            xx, y, z,
            x, y, z,
            dx, yy, z,
            
            x, y, zz,
            xx, y, zz,
            dx, yy, zz
        );
        this.end();
        
        this.start(Tessellator.QUAD);
        this.setVertex(
            xx, y, zz,
            x, y, zz,
            x, y, z,
            xx, y, z,
            
            xx, y, zz,
            xx, y, z,
            dx, yy, z,
            dx, yy, zz,
            
            x, y, z,
            x, y, zz,
            dx, yy, zz,
            dx, yy, z
        );
        this.end();
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5],
            vec = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        var dx = (x + xx) / 2;
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(Tessellator.vec3(xx, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, zz).multiply(mat));
        this.end();
        
        this.start(Tessellator.QUAD);
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, z).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, z).multiply(mat));
        this.end();
    }
}

Tessellator.Model.prototype.drawTetrahedron = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3];
        
        this.start(Tessellator.LINE);
        this.setVertex(
            x - w / 2, y - w / 2, z - w / 2,
            x + w / 2, y - w / 2, z - w / 2,
            x - w / 2, y - w / 2, z + w / 2,
            x + w / 2, y - w / 2, z + w / 2,
            x, y + w / 2, z
        );
        this.end([0, 1, 0, 2, 3, 1, 3, 2, 0, 4, 1, 4, 2, 4, 3, 4]);
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            vec = arguments[4];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.LINE);
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z).multiply(mat));
        this.end([0, 1, 0, 2, 3, 1, 3, 2, 0, 4, 1, 4, 2, 4, 3, 4]);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5];
        
        var
            dx = (x + xx) / 2,
            dz = (z + zz) / 2;
        
        this.start(Tessellator.LINE);
        this.setVertex(
            x , y, z ,
            xx, y, z ,
            x , y, zz,
            xx, y, zz,
            dx, yy, dz
        );
        this.end([0, 1, 0, 2, 3, 1, 3, 2, 0, 4, 1, 4, 2, 4, 3, 4]);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5],
            vec = arguments[6];
        
        var
            dx = (x + xx) / 2,
            dz = (z + zz) / 2;
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.LINE);
        this.setVertex(Tessellator.vec3(x , y, z ).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, z ).multiply(mat));
        this.setVertex(Tessellator.vec3(x , y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, dz).multiply(mat));
        this.end([0, 1, 0, 2, 3, 1, 3, 2, 0, 4, 1, 4, 2, 4, 3, 4]);
    }
}

Tessellator.Model.prototype.fillTetrahedron = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3];
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(
            x + w / 2, y - w / 2, z - w / 2,
            x - w / 2, y - w / 2, z - w / 2,
            x, y + w / 2, z,
            
            x - w / 2, y - w / 2, z - w / 2,
            x - w / 2, y - w / 2, z + w / 2,
            x, y + w / 2, z,
            
            x + w / 2, y - w / 2, z + w / 2,
            x + w / 2, y - w / 2, z - w / 2,
            x, y + w / 2, z,
            
            x - w / 2, y - w / 2, z + w / 2,
            x + w / 2, y - w / 2, z + w / 2,
            x, y + w / 2, z
        );
        this.end();
        
        this.start(Tessellator.QUAD);
        this.setVertex(
            x + w / 2, y - w / 2, z + w / 2,
            x - w / 2, y - w / 2, z + w / 2,
            x - w / 2, y - w / 2, z - w / 2,
            x + w / 2, y - w / 2, z - w / 2
        );
        this.end();
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            vec = arguments[4];
        
        var mat = Tessellator.mat3().rotateVec(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z).multiply(mat));
        
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z).multiply(mat));
        
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z).multiply(mat));
        
        this.setVertex(Tessellator.vec3(x - w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w / 2, y - w / 2, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w / 2, z).multiply(mat));
        this.end();
        
        this.start(Tessellator.QUAD);
        this.setVertex(Tessellator.vec3(x + w / 2, y, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w / 2, y, z + w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w / 2, y, z - w / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + w / 2, y, z - w / 2).multiply(mat));
        this.end();
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5];
        
        var
            dx = (x + xx) / 2,
            dz = (z + zz) / 2;
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(
            xx, y, z,
            x , y, z,
            dx, yy, dz,
            
            x, y, z ,
            x, y, zz,
            dx, yy, dz,
            
            xx, y, zz,
            xx, y, z ,
            dx, yy, dz,
            
            x , y, zz,
            xx, y, zz,
            dx, yy, dz
        );
        this.end();
        
        this.start(Tessellator.QUAD);
        this.setVertex(
            xx, y, zz,
            x , y, zz,
            x , y, z ,
            xx, y, z 
        );
        this.end();
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5],
            vec = arguments[6];
        
        var
            dx = (x + xx) / 2,
            dz = (z + zz) / 2;
        
        var mat = Tessellator.mat3().rotateVec(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(Tessellator.vec3(xx, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, dz).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, dz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, dz).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, dz).multiply(mat));
        this.end();
        
        this.start(Tessellator.QUAD);
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x , y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x , y, z ).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, z ).multiply(mat));
        this.end();
    }
}

Tessellator.Model.prototype.drawPyramid = Tessellator.Model.prototype.drawTetrahedron;

Tessellator.Model.prototype.fillPyramid = Tessellator.Model.prototype.fillPyramid;

Tessellator.Model.prototype.drawHalfTetrahedron = function (){
    if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            wx = arguments[3],
            wy = arguments[4];
        
        this.start(Tessellator.LINE);
        this.setVertex(
            x - wx / 2, y - wx / 2, z - wx / 2,
            x + wx / 2, y - wx / 2, z - wx / 2,
            x - wx / 2, y - wx / 2, z + wx / 2,
            x + wx / 2, y - wx / 2, z + wx / 2,
            x - wy / 2, y + wy / 2, z - wy / 2,
            x + wy / 2, y + wy / 2, z - wy / 2,
            x - wy / 2, y + wy / 2, z + wy / 2,
            x + wy / 2, y + wy / 2, z + wy / 2
        );
        this.end([0, 1, 0, 2, 0, 4, 7, 3, 7, 6, 7, 5, 3, 2, 3, 1, 4, 5, 4, 6, 5, 1, 6, 2]);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            wx = arguments[3],
            wy = arguments[4]
            vec = arguments[5];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.LINE);
        this.setVertex(Tessellator.vec3(x - wx / 2, y - wx / 2, z - wx / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wx / 2, y - wx / 2, z - wx / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - wx / 2, y - wx / 2, z + wx / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wx / 2, y - wx / 2, z + wx / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - wy / 2, y + wy / 2, z - wy / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wy / 2, y + wy / 2, z - wy / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x - wy / 2, y + wy / 2, z + wy / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wy / 2, y + wy / 2, z + wy / 2).multiply(mat));
        this.end([0, 1, 0, 2, 0, 4, 7, 3, 7, 6, 7, 5, 3, 2, 3, 1, 4, 5, 4, 6, 5, 1, 6, 2]);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5],
            cut = arguments[6];
        
        this.start(Tessellator.LINE);
        this.setVertex(
            x , y, z ,
            xx, y, z ,
            x , y, zz,
            xx, y, zz,
            
            x  + cut * (xx - x) / 2, yy, z  + cut * (zz - z) / 2,
            xx - cut * (xx - x) / 2, yy, z  + cut * (zz - z) / 2,
            x  + cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2,
            xx - cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2
        );
        this.end([0, 1, 0, 2, 0, 4, 7, 3, 7, 6, 7, 5, 3, 2, 3, 1, 4, 5, 4, 6, 5, 1, 6, 2]);
    }else if (arguments.length === 8){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5],
            cut = arguments[6],
            vec = arguments[7];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.LINE);
        this.setVertex(Tessellator.vec3(x , y, z ).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, z ).multiply(mat));
        this.setVertex(Tessellator.vec3(x , y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x  + cut * (xx - x) / 2, yy, z  + cut * (zz - z) / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(xx - cut * (xx - x) / 2, yy, z  + cut * (zz - z) / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x  + cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(xx - cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2).multiply(mat));
        this.end([0, 1, 0, 2, 0, 4, 7, 3, 7, 6, 7, 5, 3, 2, 3, 1, 4, 5, 4, 6, 5, 1, 6, 2]);
    }
}

Tessellator.Model.prototype.fillHalfTetrahedron = function (){
    if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            wx = arguments[3] / 2,
            wy = arguments[4] / 2;
        
        this.start(Tessellator.QUAD);
        this.setVertex(
            x - wx, y - wx, z + wx,
            x + wx, y - wx, z + wx,
            x + wy, y + wy, z + wy,
            x - wy, y + wy, z + wy,
            
            x + wx, y - wx, z - wx,
            x - wx, y - wx, z - wx,
            x - wy, y + wy, z - wy,
            x + wy, y + wy, z - wy,
            
            x - wx, y - wx, z - wx,
            x - wx, y - wx, z + wx,
            x - wy, y + wy, z + wy,
            x - wy, y + wy, z - wy,
            
            x + wx, y - wx, z + wx,
            x + wx, y - wx, z - wx,
            x + wy, y + wy, z - wy,
            x + wy, y + wy, z + wy,
            
            x - wy, y + wy, z + wy,
            x + wy, y + wy, z + wy,
            x + wy, y + wy, z - wy,
            x - wy, y + wy, z - wy,
            
            x - wx, y - wx, z - wx,
            x + wx, y - wx, z - wx,
            x + wx, y - wx, z + wx,
            x - wx, y - wx, z + wx
        );
        this.end();
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            wx = arguments[3] / 2,
            wy = arguments[4] / 2,
            vec = arguments[5];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.QUAD);
        this.setVertex(Tessellator.vec3(x - wx, y - wx, z + wx).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wx, y - wx, z + wx).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wy, y + wy, z + wy).multiply(mat));
        this.setVertex(Tessellator.vec3(x - wy, y + wy, z + wy).multiply(mat));
        
        this.setVertex(Tessellator.vec3(x + wx, y - wx, z - wx).multiply(mat));
        this.setVertex(Tessellator.vec3(x - wx, y - wx, z - wx).multiply(mat));
        this.setVertex(Tessellator.vec3(x - wy, y + wy, z - wy).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wy, y + wy, z - wy).multiply(mat));
        
        this.setVertex(Tessellator.vec3(x - wx, y - wx, z - wx).multiply(mat));
        this.setVertex(Tessellator.vec3(x - wx, y - wx, z + wx).multiply(mat));
        this.setVertex(Tessellator.vec3(x - wy, y + wy, z + wy).multiply(mat));
        this.setVertex(Tessellator.vec3(x - wy, y + wy, z - wy).multiply(mat));
            
        this.setVertex(Tessellator.vec3(x + wx, y - wx, z + wx).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wx, y - wx, z - wx).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wy, y + wy, z - wy).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wy, y + wy, z + wy).multiply(mat));
            
        this.setVertex(Tessellator.vec3(x - wy, y + wy, z + wy).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wy, y + wy, z + wy).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wy, y + wy, z - wy).multiply(mat));
        this.setVertex(Tessellator.vec3(x - wy, y + wy, z - wy).multiply(mat));
            
        this.setVertex(Tessellator.vec3(x - wx, y - wx, z - wx).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wx, y - wx, z - wx).multiply(mat));
        this.setVertex(Tessellator.vec3(x + wx, y - wx, z + wx).multiply(mat));
        this.setVertex(Tessellator.vec3(x - wx, y - wx, z + wx).multiply(mat));
        this.end();
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5],
            cut = arguments[6];
        
        this.start(Tessellator.QUAD);
        this.setVertex(
            x, y, zz,
            xx, y, zz,
            xx - cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2,
            x + cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2,
            
            xx, y, z,
            x, y, z,
            x + cut * (xx - x) / 2, yy, z + cut * (zz - z) / 2,
            xx - cut * (xx - x) / 2, yy, z + cut * (zz - z) / 2,
            
            x, y, z,
            x, y, zz,
            x + cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2,
            x + cut * (xx - x) / 2, yy, z + cut * (zz - z) / 2,
            
            xx, y, zz,
            xx, y, z,
            xx - cut * (xx - x) / 2, yy, z + cut * (zz - z) / 2,
            xx - cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2,
            
            x + cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2,
            xx - cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2,
            xx - cut * (xx - x) / 2, yy, z + cut * (zz - z) / 2,
            x + cut * (xx - x) / 2, yy, z + cut * (zz - z) / 2,
            
            x, y, z,
            xx, y, z,
            xx, y, zz,
            x, y, zz
        );
        this.end();
    }else if (arguments.length === 8){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5],
            cut = arguments[6]
            vec = arguments[7];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.QUAD);
        this.setVertex(Tessellator.vec3(x, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx - cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2).multiply(mat));
        
        this.setVertex(Tessellator.vec3(xx, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x + cut * (xx - x) / 2, yy, z + cut * (zz - z) / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(xx - cut * (xx - x) / 2, yy, z + cut * (zz - z) / 2).multiply(mat));
        
        this.setVertex(Tessellator.vec3(x, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x + cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + cut * (xx - x) / 2, yy, z + cut * (zz - z) / 2).multiply(mat));
            
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(xx - cut * (xx - x) / 2, yy, z + cut * (zz - z) / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(xx - cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2).multiply(mat));
            
        this.setVertex(Tessellator.vec3(x + cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(xx - cut * (xx - x) / 2, yy, zz - cut * (zz - z) / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(xx - cut * (xx - x) / 2, yy, z + cut * (zz - z) / 2).multiply(mat));
        this.setVertex(Tessellator.vec3(x + cut * (xx - x) / 2, yy, z + cut * (zz - z) / 2).multiply(mat));
            
        this.setVertex(Tessellator.vec3(x, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(xx, y, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, zz).multiply(mat));
        this.end();
    }
}

Tessellator.Model.prototype.drawHalfPyramid = Tessellator.Model.prototype.drawHalfTetrahedron;

Tessellator.Model.prototype.fillHalfPyramid = Tessellator.Model.prototype.fillHalfTetrahedron;

Tessellator.Model.prototype.drawSphere = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            q = Math.max(8, Math.ceil(r * 8));
        
        var vertices = [];
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                vertices.push(xx * r + x);
                vertices.push(yy * r + y);
                vertices.push(zz * r + z);
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U + 1);
                vertexBuffer.push(V);
                
                vertexBuffer.push(U);
                vertexBuffer.push(V + 1);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            q = arguments[4];
        
        var vertices = [];
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                vertices.push(xx * r + x);
                vertices.push(yy * r + y);
                vertices.push(zz * r + z);
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U + 1);
                vertexBuffer.push(V);
                
                vertexBuffer.push(U);
                vertexBuffer.push(V + 1);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4],
            rz = arguments[5],
            q = arguments[6];
        
        var vertices = [];
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                vertices.push(xx * rx + x);
                vertices.push(yy * ry + y);
                vertices.push(zz * rz + z);
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U + 1);
                vertexBuffer.push(V);
                
                vertexBuffer.push(U);
                vertexBuffer.push(V + 1);
            }
        }
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }
}

Tessellator.Model.prototype.fillSphere = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            q = Math.max(8, Math.ceil(r * 8));
        
        var normals = [];
        var texture = [];
        var vertices = [];
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                normals.push(xx);
                normals.push(yy);
                normals.push(zz);
                
                texture.push(ii / (q * 2));
                texture.push(1 - (i / q));
                
                vertices.push(xx * r + x);
                vertices.push(yy * r + y);
                vertices.push(zz * r + z);
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U);
                vertexBuffer.push(V);
                vertexBuffer.push(U + 1);
                
                vertexBuffer.push(V);
                vertexBuffer.push(V + 1);
                vertexBuffer.push(U + 1);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(normals);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(texture);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            q = arguments[4];
        
        var normals = [];
        var texture = [];
        var vertices = [];
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                normals.push(xx);
                normals.push(yy);
                normals.push(zz);
                
                texture.push(ii / (q * 2));
                texture.push(1 - (i / q));
                
                vertices.push(xx * r + x);
                vertices.push(yy * r + y);
                vertices.push(zz * r + z);
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U);
                vertexBuffer.push(V);
                vertexBuffer.push(U + 1);
                
                vertexBuffer.push(V);
                vertexBuffer.push(V + 1);
                vertexBuffer.push(U + 1);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(normals);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(texture);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4],
            rz = arguments[5],
            q = arguments[6];
        
        var normals = [];
        var texture = [];
        var vertices = [];
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                normals.push(xx);
                normals.push(yy);
                normals.push(zz);
                
                texture.push(ii / (q * 2));
                texture.push(1 - (i / q));
                
                vertices.push(xx * rx + x);
                vertices.push(yy * ry + y);
                vertices.push(zz * rz + z);
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U);
                vertexBuffer.push(V);
                vertexBuffer.push(U + 1);
                
                vertexBuffer.push(V);
                vertexBuffer.push(V + 1);
                vertexBuffer.push(U + 1);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(normals);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(texture);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }
}

Tessellator.Model.prototype.drawHemisphere = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            q = Math.max(8, Math.ceil(r * 8));
        
        var vertices = [];
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q / 2);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                vertices.push(xx * r + x);
                vertices.push(yy * r + y);
                vertices.push(zz * r + z);
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U + 1);
                vertexBuffer.push(V);
                
                vertexBuffer.push(U);
                vertexBuffer.push(V + 1);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            q = arguments[4];
        
        var vertices = [];
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q / 2);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                vertices.push(xx * r + x);
                vertices.push(yy * r + y);
                vertices.push(zz * r + z);
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U + 1);
                vertexBuffer.push(V);
                
                vertexBuffer.push(U);
                vertexBuffer.push(V + 1);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4],
            rz = arguments[5],
            q = arguments[6];
        
        var vertices = [];
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q / 2);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                vertices.push(xx * rx + x);
                vertices.push(yy * ry + y);
                vertices.push(zz * rz + z);
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U + 1);
                vertexBuffer.push(V);
                
                vertexBuffer.push(U);
                vertexBuffer.push(V + 1);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }else if (arguments.length === 8){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4],
            rz = arguments[5],
            vec = arguments[6],
            q = arguments[7];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        var vertices = new Tessellator.Array();
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q / 2);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                vertices.push(Tessellator.vec3(xx * rx + x, yy * ry + y, zz * rz + z).multiply(mat));
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U + 1);
                vertexBuffer.push(V);
                
                vertexBuffer.push(U);
                vertexBuffer.push(V + 1);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }
}

Tessellator.Model.prototype.fillHemisphere = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            q = Math.max(8, Math.ceil(r * 8));
        
        var normals = [];
        var texture = [];
        var vertices = [];
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q / 2);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                normals.push(xx);
                normals.push(yy);
                normals.push(zz);
                
                texture.push(ii / (q * 2));
                texture.push(1 - (i / q));
                
                vertices.push(xx * r + x);
                vertices.push(yy * r + y);
                vertices.push(zz * r + z);
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U);
                vertexBuffer.push(V);
                vertexBuffer.push(U + 1);
                
                vertexBuffer.push(V);
                vertexBuffer.push(V + 1);
                vertexBuffer.push(U + 1);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(normals);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(texture);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            q = arguments[4];
        
        var normals = [];
        var texture = [];
        var vertices = [];
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q / 2);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                normals.push(xx);
                normals.push(yy);
                normals.push(zz);
                
                texture.push(ii / (q * 2));
                texture.push(1 - (i / q));
                
                vertices.push(xx * r + x);
                vertices.push(yy * r + y);
                vertices.push(zz * r + z);
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U);
                vertexBuffer.push(V);
                vertexBuffer.push(U + 1);
                
                vertexBuffer.push(V);
                vertexBuffer.push(V + 1);
                vertexBuffer.push(U + 1);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(normals);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(texture);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4],
            rz = arguments[5],
            q = arguments[6];
        
        var normals = [];
        var texture = [];
        var vertices = [];
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q / 2);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                normals.push(xx);
                normals.push(yy);
                normals.push(zz);
                
                texture.push(ii / (q * 2));
                texture.push(1 - (i / q));
                
                vertices.push(xx * rx + x);
                vertices.push(yy * ry + y);
                vertices.push(zz * rz + z);
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U);
                vertexBuffer.push(V);
                vertexBuffer.push(U + 1);
                
                vertexBuffer.push(V);
                vertexBuffer.push(V + 1);
                vertexBuffer.push(U + 1);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(normals);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(texture);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }else if (arguments.length === 8){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4],
            rz = arguments[5],
            vec = arguments[6]
            q = arguments[7];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        var normals = new Tessellator.Array();
        var texture = [];
        var vertices = new Tessellator.Array();
        
        for (var i = 0; i <= q; i++){
            var angleY = Math.PI * (i / q / 2);
            
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);
            
            for (var ii = 0; ii <= q * 2; ii++){
                var angleX = -(Math.PI * 2) * (ii / (q * 2));
                
                var sinX = Math.sin(angleX);
                var cosX = Math.cos(angleX);
                
                var
                    xx = cosX * sinY,
                    yy = cosY,
                    zz = sinX * sinY;
                
                normals.push(Tessellator.vec3(xx, yy, zz).multiply(mat));
                
                texture.push(ii / (q * 2));
                texture.push(1 - (i / q));
                
                vertices.push(Tessellator.vec3(xx * rx + x, yy * ry + y, zz * rz + z).multiply(mat));
            }
        }
        
        var vertexBuffer = [];
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii < q * 2; ii++){
                var U = (i * (q * 2 + 1)) + ii;
                var V = U + q * 2 + 1;
                
                vertexBuffer.push(U);
                vertexBuffer.push(V);
                vertexBuffer.push(U + 1);
                
                vertexBuffer.push(V);
                vertexBuffer.push(V + 1);
                vertexBuffer.push(U + 1);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(normals);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(texture);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vertices);
        this.end(vertexBuffer);
    }
}

Tessellator.Model.prototype.drawHalfSphere = Tessellator.Model.prototype.drawHemisphere;

Tessellator.Model.prototype.fillHalfSphere = Tessellator.Model.prototype.fillHemisphere;

Tessellator.Model.prototype.drawGrid = function (){
    if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            w = arguments[2],
            h = arguments[3],
            sx = arguments[4],
            sy = arguments[5];
        
        this.start(Tessellator.LINE);
        
        for (var i = 0; i <= sx; i++){
            this.setVertex(
                x + w * i / sx, y, 0,
                x + w * i / sx, y + h, 0
            );
        }
        
        for (var i = 0; i <= sy; i++){
            this.setVertex(
                x, y + h * i / sy, 0,
                x + w, y + h * i / sy, 0
            );
        }
        
        this.end();
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            w = arguments[2],
            h = arguments[3],
            sx = arguments[4],
            sy = arguments[5],
            vec = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, -1, 0));
        
        this.start(Tessellator.LINE);
        
        for (var i = 0; i <= sx; i++){
            this.setVertex(Tessellator.vec3(x + w * i / sx, 0, y).multiply(mat));
            this.setVertex(Tessellator.vec3(x + w * i / sx, 0, y + h).multiply(mat));
        }
        
        for (var i = 0; i <= sy; i++){
            this.setVertex(Tessellator.vec3(x, 0, y + h * i / sy).multiply(mat));
            this.setVertex(Tessellator.vec3(x + w, 0, y + h * i / sy).multiply(mat));
        }
        
        this.end();
    }else if (arguments.length === 8){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            h = arguments[4],
            sx = arguments[5],
            sy = arguments[6],
            vec = arguments[7];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, -1, 0));
        
        this.start(Tessellator.LINE);
        
        for (var i = 0; i <= sx; i++){
            this.setVertex(Tessellator.vec3(x + w * i / sx, z, y).multiply(mat));
            this.setVertex(Tessellator.vec3(x + w * i / sx, z, y + h).multiply(mat));
        }
        
        for (var i = 0; i <= sy; i++){
            this.setVertex(Tessellator.vec3(x, z, y + h * i / sy).multiply(mat));
            this.setVertex(Tessellator.vec3(x + w, z, y + h * i / sy).multiply(mat));
        }
        
        this.end();
    }
}

Tessellator.Model.prototype.fillGrid = function (){
    if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            w = arguments[2],
            h = arguments[3],
            sx = arguments[4],
            sy = arguments[5];
        
        this.start(Tessellator.QUAD);
        for (var i = 0; i <= sx; i++){
            for (var ii = 0; ii <= sy; ii++){
                if ((i + ii) % 2 === 0){
                    this.setVertex(
                        x + w * i / sx, y + h * ii / sy, 0,
                        x + w * (i + 1) / sx, y + h * ii / sy, 0,
                        x + w * (i + 1) / sx, y + h * (ii + 1) / sy, 0,
                        x + w * i / sx, y + h * (ii + 1) / sy, 0
                    );
                }
            }
        }
        this.end();
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            w = arguments[2],
            h = arguments[3],
            sx = arguments[4],
            sy = arguments[5],
            vec = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, -1, 0));
        
        this.start(Tessellator.QUAD);
        for (var i = 0; i <= sx; i++){
            for (var ii = 0; ii <= sy; ii++){
                if ((i + ii) % 2 === 0){
                    this.setVertex(Tessellator.vec3(x + w * i / sx, 0, y + h * ii / sy).multiply(mat));
                    this.setVertex(Tessellator.vec3(x + w * (i + 1) / sx, 0, y + h * ii / sy).multiply(mat));
                    this.setVertex(Tessellator.vec3(x + w * (i + 1) / sx, 0, y + h * (ii + 1) / sy).multiply(mat));
                    this.setVertex(Tessellator.vec3(x + w * i / sx, 0, y + h * (ii + 1) / sy).multiply(mat));
                }
            }
        }
        this.end();
    }else if (arguments.length === 8){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            h = arguments[4],
            sx = arguments[5],
            sy = arguments[6],
            vec = arguments[7];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, -1, 0));
        
        this.start(Tessellator.QUAD);
        for (var i = 0; i <= sx; i++){
            for (var ii = 0; ii <= sy; ii++){
                if ((i + ii) % 2 === 0){
                    this.setVertex(Tessellator.vec3(x + w * i / sx, z, y + h * ii / sy).multiply(mat));
                    this.setVertex(Tessellator.vec3(x + w * (i + 1) / sx, z, y + h * ii / sy).multiply(mat));
                    this.setVertex(Tessellator.vec3(x + w * (i + 1) / sx, z, y + h * (ii + 1) / sy).multiply(mat));
                    this.setVertex(Tessellator.vec3(x + w * i / sx, z, y + h * (ii + 1) / sy).multiply(mat));
                }
            }
        }
        this.end();
    }
}

Tessellator.Model.prototype.fillInverseGrid = function (){
    if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            w = arguments[2],
            h = arguments[3],
            sx = arguments[4],
            sy = arguments[5];
        
        this.start(Tessellator.QUAD);
        for (var i = 0; i <= sx; i++){
            for (var ii = 0; ii <= sy; ii++){
                if ((i + ii) % 2 === 1){
                    this.setVertex(
                        x + w * i / sx, y + h * ii / sy, 0,
                        x + w * (i + 1) / sx, y + h * ii / sy, 0,
                        x + w * (i + 1) / sx, y + h * (ii + 1) / sy, 0,
                        x + w * i / sx, y + h * (ii + 1) / sy, 0
                    );
                }
            }
        }
        this.end();
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            w = arguments[2],
            h = arguments[3],
            sx = arguments[4],
            sy = arguments[5],
            vec = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, -1, 0));
        
        this.start(Tessellator.QUAD);
        for (var i = 0; i <= sx; i++){
            for (var ii = 0; ii <= sy; ii++){
                if ((i + ii) % 2 === 1){
                    this.setVertex(Tessellator.vec3(x + w * i / sx, 0, y + h * ii / sy).multiply(mat));
                    this.setVertex(Tessellator.vec3(x + w * (i + 1) / sx, 0, y + h * ii / sy).multiply(mat));
                    this.setVertex(Tessellator.vec3(x + w * (i + 1) / sx, 0, y + h * (ii + 1) / sy).multiply(mat));
                    this.setVertex(Tessellator.vec3(x + w * i / sx, 0, y + h * (ii + 1) / sy).multiply(mat));
                }
            }
        }
        this.end();
    }else if (arguments.length === 8){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            h = arguments[4],
            sx = arguments[5],
            sy = arguments[6],
            vec = arguments[7];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, -1, 0));
        
        this.start(Tessellator.QUAD);
        for (var i = 0; i <= sx; i++){
            for (var ii = 0; ii <= sy; ii++){
                if ((i + ii) % 2 === 1){
                    this.setVertex(Tessellator.vec3(x + w * i / sx, z, y + h * ii / sy).multiply(mat));
                    this.setVertex(Tessellator.vec3(x + w * (i + 1) / sx, z, y + h * ii / sy).multiply(mat));
                    this.setVertex(Tessellator.vec3(x + w * (i + 1) / sx, z, y + h * (ii + 1) / sy).multiply(mat));
                    this.setVertex(Tessellator.vec3(x + w * i / sx, z, y + h * (ii + 1) / sy).multiply(mat));
                }
            }
        }
        this.end();
    }
}

Tessellator.Model.prototype.drawCross = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3] / 2;
        
        this.start(Tessellator.LINE);
        this.setVertex(
            x + w, y, z,
            x - w, y, z,
            x, y + w, z,
            x, y - w, z,
            x, y, z + w,
            x, y, z - w
        );
        this.end();
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3] / 2,
            vec = arguments[4];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.LINE);
        this.setVertex(Tessellator.vec3(x + w, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x - w, y, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y + w, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y - w, z).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, z + w).multiply(mat));
        this.setVertex(Tessellator.vec3(x, y, z - w).multiply(mat));
        this.end();
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5];
        
        var
            dx = (x + xx) / 2,
            dy = (y + yy) / 2,
            dz = (z + zz) / 2;
        
        this.start(Tessellator.LINE);
        this.setVertex(
            xx, dy, dz,
            x , dy, dz,
            dx, yy, dz,
            dx, y , dz,
            dx, dy, zz,
            dx, dy, z 
        );
        this.end();
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5],
            vec = arguments[6];
        
        var
            dx = (x + xx) / 2,
            dy = (y + yy) / 2,
            dz = (z + zz) / 2;
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        this.start(Tessellator.LINE);
        this.setVertex(Tessellator.vec3(xx, dy, dz).multiply(mat));
        this.setVertex(Tessellator.vec3(x, dy, dz).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, yy, dz).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, y, dz).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, dy, zz).multiply(mat));
        this.setVertex(Tessellator.vec3(dx, dy, z).multiply(mat));
        this.end();
    }
}

Tessellator.Model.prototype.drawLine = function (){
    if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            xx = arguments[2],
            yy = arguments[3];
        
        this.start(Tessellator.LINE);
        this.setVertex(
            x, y, 0,
            xx, yy, 0
        );
        this.end();
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            xx = arguments[3],
            yy = arguments[4],
            zz = arguments[5];
        
        this.start(Tessellator.LINE);
        this.setVertex(
            x, y, z,
            xx, yy, zz
        );
        this.end();
    }
}

Tessellator.Model.prototype.drawOval = function (){
    if (arguments.length === 3){
        var
            x = arguments[0],
            y = arguments[1],
            w = arguments[2],
            q = Math.max(8, Math.ceil(w * 8));
        
        
        var indices = [];
        
        this.start(Tessellator.LINE);
        for (var i = 0; i < q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            this.setVertex(x + s * w, y + c * w, 0);
            
            indices.push(i, (i + 1) % q);
        }
        this.end(indices);
    }else if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            q = Math.max(8, Math.ceil(w * 8));
        
        
        var indices = [];
        
        this.start(Tessellator.LINE);
        for (var i = 0; i < q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            this.setVertex(x + s * w, y + c * w, z);
            
            indices.push(i, (i + 1) % q);
        }
        this.end(indices);
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            q = arguments[4];
        
        
        var indices = [];
        
        this.start(Tessellator.LINE);
        for (var i = 0; i < q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            this.setVertex(x + s * w, y + c * w, z);
            
            indices.push(i, (i + 1) % q);
        }
        this.end(indices);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            vec = arguments[4],
            q = arguments[5];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        var indices = [];
        
        this.start(Tessellator.LINE);
        for (var i = 0; i < q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            this.setVertex(Tessellator.vec3(x + s * w, y, z + c * w).multiply(mat));
            
            indices.push(i, (i + 1) % q);
        }
        this.end(indices);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4]
            vec = arguments[5],
            q = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        var indices = [];
        
        this.start(Tessellator.LINE);
        for (var i = 0; i < q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            this.setVertex(Tessellator.vec3(x + s * rx, y, z + c * ry).multiply(mat));
            
            indices.push(i, (i + 1) % q);
        }
        this.end(indices);
    }
}

Tessellator.Model.prototype.fillOval = function (){
    if (arguments.length === 3){
        var
            x = arguments[0],
            y = arguments[1],
            w = arguments[2],
            q = Math.max(8, Math.ceil(w * 8));
        
        
        var indices = [];
        var ver = [x, y, 0];
        var tex = [.5, .5];
        
        for (var i = 0; i < q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(x + s * w, y + c * w, 0);
            tex.push(s / 2 + .5, c / 2 + .5);
            
            if (i + 1 === q){
                indices.push(0, i + 1, 1);
            }else{
                indices.push(0, i + 1, i + 2);
            }
        }
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 4){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            q = Math.max(8, Math.ceil(w * 8));
        
        
        var indices = [];
        var ver = [x, y, z];
        var tex = [.5, .5];
        
        for (var i = 0; i < q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(x + s * w, y + c * w, z);
            tex.push(s / 2 + .5, c / 2 + .5);
            
            if (i + 1 === q){
                indices.push(0, i + 1, 1);
            }else{
                indices.push(0, i + 1, i + 2);
            }
        }
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            q = arguments[4];
        
        
        var indices = [];
        var ver = [x, y, z];
        var tex = [.5, .5];
        
        for (var i = 0; i < q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(x + s * w, y + c * w, z);
            tex.push(s / 2 + .5, c / 2 + .5);
            
            if (i + 1 === q){
                indices.push(0, i + 1, 1);
            }else{
                indices.push(0, i + 1, i + 2);
            }
        }
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            w = arguments[3],
            vec = arguments[4],
            q = arguments[5];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        var indices = [];
        var ver = new Tessellator.Array(Tessellator.vec3(x, y, z).multiply(mat));
        var tex = [.5, .5];
        
        for (var i = 0; i < q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(Tessellator.vec3(x + s * w, y, z + c * w).multiply(mat));
            tex.push(s / 2 + .5, c / 2 + .5);
            
            if (i + 1 === q){
                indices.push(0, i + 1, 1);
            }else{
                indices.push(0, i + 1, i + 2);
            }
        }
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4]
            vec = arguments[5],
            q = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        var indices = [];
        var ver = new Tessellator.Array([x, y, z]);
        var tex = [.5, .5];
        
        for (var i = 0; i < q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(Tessellator.vec3(x + s * rx, y, z + c * ry).multiply(mat));
            tex.push(s / 2 + .5, c / 2 + .5);
            
            if (i + 1 === q){
                indices.push(0, i + 1, 1);
            }else{
                indices.push(0, i + 1, i + 2);
            }
        }
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }
}

Tessellator.Model.prototype.drawCircle = Tessellator.Model.prototype.drawOval;

Tessellator.Model.prototype.fillCircle = Tessellator.Model.prototype.fillOval;

Tessellator.Model.prototype.drawCilinder = function (){
    if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4] / 2,
            q = Math.max(8, Math.ceil(r * 8));
        
        var ver = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(
                x + s * r, y - h, z + c * r,
                x + s * r, y + h, z + c * r
            );
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii, ii + 1, ii, ii + 2, ii + 1, ii + 3);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4] / 2,
            q = arguments[5];
        
        var ver = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(
                x + s * r, y - h, z + c * r,
                x + s * r, y + h, z + c * r
            );
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii, ii + 1, ii, ii + 2, ii + 1, ii + 3);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4] / 2,
            vec = arguments[5],
            q = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        var ver = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(
                Tessellator.vec3(x + s * r, y - h, z + c * r).multiply(mat),
                Tessellator.vec3(x + s * r, y + h, z + c * r).multiply(mat)
            );
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii, ii + 1, ii, ii + 2, ii + 1, ii + 3);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(ver);
        this.end(indices);
    }
}

Tessellator.Model.prototype.fillCilinder = function (){
    if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4] / 2,
            q = Math.max(8, Math.ceil(r * 8));
        
        var ver = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var norm = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            norm.push(s, 0, c, s, 0, c);
            ver.push(
                x + s * r, y - h, z + c * r,
                x + s * r, y + h, z + c * r
            );
            tex.push(i / q, 0, i / q, 1);
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii + 1, ii, ii + 2, ii + 3, ii + 1, ii + 2);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(norm);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4] / 2,
            q = arguments[5];
        
        var ver = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var norm = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            norm.push(s, 0, c, s, 0, c);
            ver.push(
                x + s * r, y - h, z + c * r,
                x + s * r, y + h, z + c * r
            );
            tex.push(i / q, 0, i / q, 1);
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii + 1, ii, ii + 2, ii + 3, ii + 1, ii + 2);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(norm);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4] / 2,
            vec = arguments[5],
            q = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        var ver = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var norm = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            norm.push(Tessellator.vec3(s, 0, c).multiply(mat), Tessellator.vec3(s, 0, c).multiply(mat));
            
            ver.push(
                Tessellator.vec3(x + s * r, y - h, z + c * r).multiply(mat),
                Tessellator.vec3(x + s * r, y + h, z + c * r).multiply(mat)
            );
            
            tex.push(i / q, 0, i / q, 1);
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii + 1, ii, ii + 2, ii + 3, ii + 1, ii + 2);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(norm);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }
}

Tessellator.Model.prototype.drawFullCilinder = Tessellator.Model.prototype.drawCilinder;

Tessellator.Model.prototype.fillFullCilinder = function (){
    if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4],
            q = Math.max(8, Math.ceil(r * 8));
        
        this.fillCilinder(x, y, z, r, h, q);
        this.fillCircle(x, y, z - h / 2, r, Tessellator.vec3(0, -1, 0), q);
        this.fillCircle(x, y, z - h / 2, r, Tessellator.vec3(0, 1, 0), q);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4],
            q = arguments[5];
        
        this.fillCilinder(x, y, z, r, h, q);
        this.fillCircle(x, y, z - h / 2, r, Tessellator.vec3(0, -1, 0), q);
        this.fillCircle(x, y, z - h / 2, r, Tessellator.vec3(0, 1, 0), q);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4],
            vec = arguments[5],
            q = arguments[6];
        
        this.fillCilinder(x, y, z, r, h, vec, q);
        this.fillOval(x, y + h / 2, z, r, vec.clone().negate(), q);
        this.fillOval(x, y + h / 2, z, r, vec, q);
    }
}

Tessellator.Model.prototype.drawCone = function (){
    if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4] / 2,
            q = Math.max(8, Math.ceil(r * 8));
        
        var ver = new Tessellator.Array([x, y + h, z]);
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(x + s * r, y - h, z + c * r);
            
            if (i !== q){
                indices.push(i, i + 1, 0, i);
            }else{
                indices.push(i, 1, 0, i);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4] / 2,
            q = arguments[5];
        
        var ver = new Tessellator.Array([x, y + h, z]);
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(x + s * r, y - h, z + c * r);
            
            if (i !== q){
                indices.push(i, i + 1, 0, i);
            }else{
                indices.push(i, 1, 0, i);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4] / 2,
            vec = arguments[5],
            q = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        var ver = new Tessellator.Array(Tessellator.vec3(x, y + h, z).multiply(mat));
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(Tessellator.vec3(x + s * r, y - h, z + c * r).multiply(mat));
            
            if (i !== q){
                indices.push(i, i + 1, 0, i);
            }else{
                indices.push(i, 1, 0, i);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(ver);
        this.end(indices);
    }
}

Tessellator.Model.prototype.fillCone = function (){
    if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4] / 2,
            q = Math.max(8, Math.ceil(r * 8));
        
        var ver = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var norm = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            norm.push(s, 0, c, s, 0, c);
            ver.push(
                x + s * r, y - h, z + c * r,
                x, y + h, z
            );
            tex.push(i / q, 0, i / q, 1);
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii + 1, ii, ii + 2, ii + 3, ii + 1, ii + 2);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(norm);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4] / 2,
            q = arguments[5];
        
        var ver = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var norm = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            norm.push(s, 0, c, s, 0, c);
            ver.push(
                x + s * r, y - h, z + c * r,
                x, y + h, z
            );
            tex.push(i / q, 0, i / q, 1);
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii + 1, ii, ii + 2, ii + 3, ii + 1, ii + 2);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(norm);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            h = arguments[4] / 2,
            vec = arguments[5],
            q = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        var ver = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var norm = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            norm.push(s, 0, c, s, 0, c);
            ver.push(
                Tessellator.vec3(x + s * r, y - h, z + c * r).multiply(mat),
                Tessellator.vec3(x, y + h, z).multiply(mat)
            );
            tex.push(i / q, 0, i / q, 1);
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii + 1, ii, ii + 2, ii + 3, ii + 1, ii + 2);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(norm);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }
}

Tessellator.Model.prototype.drawHalfCone = function (){
    if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4],
            h = arguments[5] / 2,
            q = Math.max(8, Math.ceil(Math.max(rx, ry) * 8));
        
        var ver = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(
                x + s * rx, y - h, z + c * rx,
                x + s * ry, y + h, z + c * ry
            );
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii, ii + 1, ii, ii + 2, ii + 1, ii + 3);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4],
            h = arguments[5] / 2,
            q = arguments[6];
        
        var ver = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(
                x + s * rx, y - h, z + c * rx,
                x + s * ry, y + h, z + c * ry
            );
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii, ii + 1, ii, ii + 2, ii + 1, ii + 3);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 8){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4],
            h = arguments[5] / 2,
            vec = arguments[6],
            q = arguments[7];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        var ver = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            ver.push(
                Tessellator.vec3(x + s * rx, y - h, z + c * rx).multiply(mat),
                Tessellator.vec3(x + s * ry, y + h, z + c * ry).multiply(mat)
            );
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii, ii + 1, ii, ii + 2, ii + 1, ii + 3);
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(ver);
        this.end(indices);
    }
}

Tessellator.Model.prototype.fillHalfCone = function (){
    if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4],
            h = arguments[5] / 2,
            q = Math.max(8, Math.ceil(Math.max(rx, ry) * 8));
        
        var ver = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var norm = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            norm.push(s, 0, c, s, 0, c);
            ver.push(
                x + s * rx, y - h, z + c * rx,
                x + s * ry, y + h, z + c * ry
            );
            tex.push(i / q, 0, i / q, 1);
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii + 1, ii, ii + 2, ii + 3, ii + 1, ii + 2);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(norm);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4],
            h = arguments[5] / 2,
            q = arguments[6];
        
        var ver = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var norm = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            norm.push(s, 0, c, s, 0, c);
            ver.push(
                x + s * rx, y - h, z + c * rx,
                x + s * ry, y + h, z + c * ry
            );
            tex.push(i / q, 0, i / q, 1);
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii + 1, ii, ii + 2, ii + 3, ii + 1, ii + 2);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(norm);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }else if (arguments.length === 8){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            rx = arguments[3],
            ry = arguments[4],
            h = arguments[5] / 2,
            vec = arguments[6],
            q = arguments[7];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 1, 0));
        
        var ver = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var norm = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i <= q; i++){
            var
                a = i / q * Math.PI * 2,
                s = Math.sin(a),
                c = Math.cos(a);
            
            norm.push(s, 0, c, s, 0, c);
            ver.push(
                Tessellator.vec3(x + s * rx, y - h, z + c * rx).multiply(mat),
                Tessellator.vec3(x + s * ry, y + h, z + c * ry).multiply(mat)
            );
            tex.push(i / q, 0, i / q, 1);
            
            var ii = i * 2;
            
            if (i !== q){
                indices.push(ii + 1, ii, ii + 2, ii + 3, ii + 1, ii + 2);
            }
        }
        
        this.start(Tessellator.NORMAL);
        this.setVertex(norm);
        this.end();
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(ver);
        this.end(indices);
    }
}

Tessellator.Model.prototype.drawTorus = function (){
    if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            s = arguments[4],
            q = Math.max(32, r * s * 32);
        
        var vec = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii <= q; ii++){
                for (var k = 1; k >= 0; k--){
                    var
                        ss = (i + k) % q + .5,
                        tt = ii % q,
                        
                        sss = Math.sin(ss / q * Math.PI * 2),
                        ssc = Math.cos(ss / q * Math.PI * 2),
                        
                        tts = Math.sin(tt / q * Math.PI * 2),
                        ttc = Math.cos(tt / q * Math.PI * 2);
                    
                    vec.push(
                        x + (1 + ssc * s) * ttc * r,
                        y + (1 + ssc * s) * tts * r,
                        z + sss * s * r
                    );
                }
                
                if (ii < q){
                    var iii = ii * 2 + i * (q + 1) * 2;
                    
                    indices.push(iii, iii + 1, iii, iii + 2, iii + 3, iii + 2, iii + 3, iii + 1);
                }
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(vec);
        this.end(indices);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            s = arguments[4],
            q = arguments[5];
        
        var vec = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii <= q; ii++){
                for (var k = 1; k >= 0; k--){
                    var
                        ss = (i + k) % q + .5,
                        tt = ii % q,
                        
                        sss = Math.sin(ss / q * Math.PI * 2),
                        ssc = Math.cos(ss / q * Math.PI * 2),
                        
                        tts = Math.sin(tt / q * Math.PI * 2),
                        ttc = Math.cos(tt / q * Math.PI * 2);
                    
                    vec.push(
                        x + (1 + ssc * s) * ttc * r,
                        y + (1 + ssc * s) * tts * r,
                        z + sss * s * r
                    );
                }
                
                if (ii < q){
                    var iii = ii * 2 + i * (q + 1) * 2;
                    
                    indices.push(iii, iii + 1, iii, iii + 2, iii + 3, iii + 2, iii + 3, iii + 1);
                }
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(vec);
        this.end(indices);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            s = arguments[4],
            vec = arguments[5]
            q = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 0, 1));
        
        var vec = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii <= q; ii++){
                for (var k = 1; k >= 0; k--){
                    var
                        ss = (i + k) % q + .5,
                        tt = ii % q,
                        
                        sss = Math.sin(ss / q * Math.PI * 2),
                        ssc = Math.cos(ss / q * Math.PI * 2),
                        
                        tts = Math.sin(tt / q * Math.PI * 2),
                        ttc = Math.cos(tt / q * Math.PI * 2);
                    
                    vec.push(Tessellator.vec3(
                        x + (1 + ssc * s) * ttc * r,
                        y + (1 + ssc * s) * tts * r,
                        z + sss * s * r).multiply(mat)
                    );
                }
                
                if (ii < q){
                    var iii = ii * 2 + i * (q + 1) * 2;
                    
                    indices.push(iii, iii + 1, iii, iii + 2, iii + 3, iii + 2, iii + 3, iii + 1);
                }
            }
        }
        
        this.start(Tessellator.LINE);
        this.setVertex(vec);
        this.end(indices);
    }
}

Tessellator.Model.prototype.fillTorus = function (){
    if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            s = arguments[4],
            q = Math.max(32, r * s * 32);
        
        var vec = new Tessellator.Array();
        var nor = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii <= q; ii++){
                for (var k = 1; k >= 0; k--){
                    var
                        ss = (i + k) % q + .5,
                        tt = ii % q,
                        
                        sss = Math.sin(ss / q * Math.PI * 2),
                        ssc = Math.cos(ss / q * Math.PI * 2),
                        
                        tts = Math.sin(tt / q * Math.PI * 2),
                        ttc = Math.cos(tt / q * Math.PI * 2);
                    
                    nor.push(ssc * ttc, ssc * tts, sss);
                    
                    vec.push(
                        x + (1 + ssc * s) * ttc * r,
                        y + (1 + ssc * s) * tts * r,
                        z + sss * s * r
                    );
                    
                    tex.push(
                        (i + k) / q,
                        tt / q
                    );
                }
                
                if (ii < q){
                    var iii = ii * 2 + i * (q + 1) * 2;
                    
                    indices.push(iii + 1, iii + 3, iii + 2, iii + 1, iii + 2, iii);
                }
            }
        }
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.NORMAL);
        this.setVertex(nor);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vec);
        this.end(indices);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            s = arguments[4],
            q = arguments[5];
        
        var vec = new Tessellator.Array();
        var nor = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii <= q; ii++){
                for (var k = 1; k >= 0; k--){
                    var
                        ss = (i + k) % q + .5,
                        tt = ii % q,
                        
                        sss = Math.sin(ss / q * Math.PI * 2),
                        ssc = Math.cos(ss / q * Math.PI * 2),
                        
                        tts = Math.sin(tt / q * Math.PI * 2),
                        ttc = Math.cos(tt / q * Math.PI * 2);
                    
                    nor.push(ssc * ttc, ssc * tts, sss);
                    
                    vec.push(
                        x + (1 + ssc * s) * ttc * r,
                        y + (1 + ssc * s) * tts * r,
                        z + sss * s * r
                    );
                    
                    tex.push(
                        (i + k) / q,
                        tt / q
                    );
                }
                
                if (ii < q){
                    var iii = ii * 2 + i * (q + 1) * 2;
                    
                    indices.push(iii + 1, iii + 3, iii + 2, iii + 1, iii + 2, iii);
                }
            }
        }
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.NORMAL);
        this.setVertex(nor);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vec);
        this.end(indices);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            s = arguments[4],
            vec = arguments[5],
            q = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 0, 1));
        
        var vec = new Tessellator.Array();
        var nor = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii <= q; ii++){
                for (var k = 1; k >= 0; k--){
                    var
                        ss = (i + k) % q + .5,
                        tt = ii % q,
                        
                        sss = Math.sin(ss / q * Math.PI * 2),
                        ssc = Math.cos(ss / q * Math.PI * 2),
                        
                        tts = Math.sin(tt / q * Math.PI * 2),
                        ttc = Math.cos(tt / q * Math.PI * 2);
                    
                    nor.push(Tessellator.vec3(ssc * ttc, ssc * tts, sss).multiply(mat));
                    
                    vec.push(Tessellator.vec3(
                        x + (1 + ssc * s) * ttc * r,
                        y + (1 + ssc * s) * tts * r,
                        z + sss * s * r).multiply(mat)
                    );
                    
                    tex.push(
                        (i + k) / q,
                        tt / q
                    );
                }
                
                if (ii < q){
                    var iii = ii * 2 + i * (q + 1) * 2;
                    
                    indices.push(iii + 1, iii + 3, iii + 2, iii + 1, iii + 2, iii);
                }
            }
        }
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.NORMAL);
        this.setVertex(nor);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vec);
        this.end(indices);
    }
}

Tessellator.Model.prototype.drawInverseTorus = Tessellator.Model.prototype.drawTorus;

Tessellator.Model.prototype.fillInverseTorus = function (){
    if (arguments.length === 5){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            s = arguments[4],
            q = Math.max(32, r * s * 32);
        
        var vec = new Tessellator.Array();
        var nor = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii <= q; ii++){
                for (var k = 1; k >= 0; k--){
                    var
                        ss = (i + k) % q + .5,
                        tt = ii % q,
                        
                        sss = Math.sin(ss / q * Math.PI * 2),
                        ssc = Math.cos(ss / q * Math.PI * 2),
                        
                        tts = Math.sin(tt / q * Math.PI * 2),
                        ttc = Math.cos(tt / q * Math.PI * 2);
                    
                    nor.push(-ssc * ttc, -ssc * tts, -sss);
                    
                    vec.push(
                        x + (1 + ssc * s) * ttc * r,
                        y + (1 + ssc * s) * tts * r,
                        z + sss * s * r
                    );
                    
                    tex.push(
                        (i + k) / q,
                        tt / q
                    );
                }
                
                if (ii < q){
                    var iii = ii * 2 + i * (q + 1) * 2;
                    
                    indices.push(iii + 3, iii + 1, iii + 2, iii + 2, iii + 1, iii);
                }
            }
        }
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.NORMAL);
        this.setVertex(nor);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vec);
        this.end(indices);
    }else if (arguments.length === 6){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            s = arguments[4],
            q = arguments[5];
        
        var vec = new Tessellator.Array();
        var nor = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii <= q; ii++){
                for (var k = 1; k >= 0; k--){
                    var
                        ss = (i + k) % q + .5,
                        tt = ii % q,
                        
                        sss = Math.sin(ss / q * Math.PI * 2),
                        ssc = Math.cos(ss / q * Math.PI * 2),
                        
                        tts = Math.sin(tt / q * Math.PI * 2),
                        ttc = Math.cos(tt / q * Math.PI * 2);
                    
                    nor.push(-ssc * ttc, -ssc * tts, -sss);
                    
                    vec.push(
                        x + (1 + ssc * s) * ttc * r,
                        y + (1 + ssc * s) * tts * r,
                        z + sss * s * r
                    );
                    
                    tex.push(
                        (i + k) / q,
                        tt / q
                    );
                }
                
                if (ii < q){
                    var iii = ii * 2 + i * (q + 1) * 2;
                    
                    indices.push(iii + 3, iii + 1, iii + 2, iii + 2, iii + 1, iii);
                }
            }
        }
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.NORMAL);
        this.setVertex(nor);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vec);
        this.end(indices);
    }else if (arguments.length === 7){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2],
            r = arguments[3],
            s = arguments[4],
            vec = arguments[5],
            q = arguments[6];
        
        var mat = Tessellator.mat3().align(vec, Tessellator.vec3(0, 0, 1));
        
        var vec = new Tessellator.Array();
        var nor = new Tessellator.Array();
        var tex = new Tessellator.Array();
        var indices = [];
        
        for (var i = 0; i < q; i++){
            for (var ii = 0; ii <= q; ii++){
                for (var k = 1; k >= 0; k--){
                    var
                        ss = (i + k) % q + .5,
                        tt = ii % q,
                        
                        sss = Math.sin(ss / q * Math.PI * 2),
                        ssc = Math.cos(ss / q * Math.PI * 2),
                        
                        tts = Math.sin(tt / q * Math.PI * 2),
                        ttc = Math.cos(tt / q * Math.PI * 2);
                    
                    nor.push(Tessellator.vec3(-ssc * ttc, -ssc * tts, -sss).multiply(mat));
                    
                    vec.push(Tessellator.vec3(
                        x + (1 + ssc * s) * ttc * r,
                        y + (1 + ssc * s) * tts * r,
                        z + sss * s * r).multiply(mat)
                    );
                    
                    tex.push(
                        (i + k) / q,
                        tt / q
                    );
                }
                
                if (ii < q){
                    var iii = ii * 2 + i * (q + 1) * 2;
                    
                    indices.push(iii + 3, iii + 1, iii + 2, iii + 2, iii + 1, iii);
                }
            }
        }
        
        this.start(Tessellator.TEXTURE);
        this.setVertex(tex);
        this.end();
        
        this.start(Tessellator.NORMAL);
        this.setVertex(nor);
        this.end();
        
        this.start(Tessellator.TRIANGLE);
        this.setVertex(vec);
        this.end(indices);
    }
}

Tessellator.Model.prototype.plotPoint = function (){
    if (arguments.length === 2){
        var
            x = arguments[0],
            y = arguments[1];
        
        this.start(Tessellator.POINT);
        this.setVertex(x, y, 0);
        this.end();
    }else if (arguments.length === 3){
        var
            x = arguments[0],
            y = arguments[1],
            z = arguments[2];
        
        this.start(Tessellator.POINT);
        this.setVertex(x, y, z);
        this.end();
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.blendFunc = function (){
    return this.add(Tessellator.new.apply(Tessellator.BlendFunc, arguments));
}

Tessellator.BlendFunc = function (){
    this.type = Tessellator.BLEND_FUNC;
    
    if (arguments.length === 1){
        this.func = arguments[0];
    }else{
        this.func = Tessellator.vec2(arguments);
    }
}

Tessellator.BlendFunc.prototype.init = function (init){
    init.flush();
}

Tessellator.BlendFunc.prototype.postInit = Tessellator.EMPTY_FUNC;

Tessellator.BlendFunc.prototype.apply = function (render){
    render.blendFunc(this.func);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.clear = function (){
    this.add(new Tessellator.Clear(Tessellator.COLOR_BUFFER_BIT.gl | Tessellator.DEPTH_BUFFER_BIT.gl, Tessellator.getColor(arguments)));
}

Tessellator.Model.prototype.clearColor = function (){
    this.add(new Tessellator.Clear(Tessellator.COLOR_BUFFER_BIT.glTessellator.getColor(arguments)));
}

Tessellator.Model.prototype.clearDepth = function (){
    this.add(new Tessellator.Clear(Tessellator.DEPTH_BUFFER_BIT.gl));
}

Tessellator.Clear = function (clearCode, color) {
    this.type = Tessellator.CLEAR;
    
    this.clearCode = clearCode;
    this.color = color;
}

Tessellator.Clear.prototype.apply = function (render){
    if ((this.clearCode & Tessellator.COLOR_BUFFER_BIT.gl) !== 0){
        if (this.color){
            render.tessellator.GL.clearColor(this.color[0], this.color[1], this.color[2], this.color[3]);
        }else{
            render.tessellator.GL.clearColor(0, 0, 0, 0);
        }
    }
    
    render.tessellator.GL.clear(this.clearCode);
}

Tessellator.Clear.prototype.init = function (interpreter){
    interpreter.flush();
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.setClip = function (x, y, width, height){
    return this.add(new Tessellator.Clip(x, y, width, height));
}

Tessellator.Clip = function (x, y, w, h){
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    
    this.clip = new Float32Array(4);
    this.clip[0] = x;
    this.clip[1] = y;
    this.clip[2] = w;
    this.clip[3] = h;
}

Tessellator.Clip.prototype.init = function (interpreter){
    interpreter.flush();
}

Tessellator.Clip.prototype.postInit = Tessellator.EMPTY_FUNC;

Tessellator.Clip.prototype.apply = function (render){
    render.set("clip", this.clip);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Initializer.setDefault("color", function () {
    return Tessellator.DEFAULT_COLOR;
});

Tessellator.Initializer.setDefault("color255", function () {
    return Tessellator.DEFAULT_COLOR.clone().multiply(255);
});

Tessellator.Model.prototype.setColor = function (){
    return this.add(new Tessellator.ColorSet(Tessellator.getColor(arguments)));
}

Tessellator.ColorSet = function (color){
    this.type = Tessellator.COLOR;
    
    this.color = color;
}


Tessellator.ColorSet.prototype.init = function (interpreter){
    if (interpreter.shape){
        throw "cannot change color while drawing";
    }
    
    if (interpreter.get("draw") !== Tessellator.COLOR){
        interpreter.flush();
        
        interpreter.set("draw", Tessellator.COLOR);
    }
    
    interpreter.set("textureBounds", null);
    interpreter.set("color", this.color);
    interpreter.set("color255", this.color.clone().multiply(255));
    
    return null;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.depthMask = function (){
    return this.add(Tessellator.new.apply(Tessellator.DepthMask, arguments));
}

Tessellator.DepthMask = function (mask){
    this.type = Tessellator.BLEND_FUNC;
    
    this.mask = mask;
}

Tessellator.DepthMask.prototype.init = function (init){
    init.flush();
}

Tessellator.DepthMask.prototype.apply = function (render){
    render.depthMask(this.mask);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.disable = function (e){
    return this.add(new Tessellator.Disable(e));
}

Tessellator.Disable = function (arg){
    this.type = Tessellator.DISABLE;
    this.arg = arg;
}


Tessellator.Disable.prototype.apply = function (render){
    if (this.arg === Tessellator.LIGHTING){
        render.set("lights", render.renderer.noLightingTexture);
    }else{
        render.disable(this.arg)
    }
}


Tessellator.Disable.prototype.init = function (interpreter){
    if (this.arg === Tessellator.NORMAL){
        interpreter.set("lighting", false);
        
        return null;
    }else if (this.arg === Tessellator.COLOR){
        interpreter.set("colorAttribEnabled", false);
        
        return null;
    }else{
        interpreter.flush();
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.enable = function (e){
    return this.add(new Tessellator.Enable(e));
}

Tessellator.Enable = function (arg){
    this.type = Tessellator.ENABLE;
    this.arg = arg;
}

Tessellator.Enable.prototype.apply = function (render){
    if (this.arg === Tessellator.LIGHTING){
        render.set("lights", render.renderer.lightingTexture);
    }else{
        render.enable(this.arg);
    }
}

Tessellator.Enable.prototype.init = function (interpreter){
    if (this.arg === Tessellator.NORMAL){
        interpreter.set("lighting", true);
        
        return null;
    }else if (this.arg === Tessellator.COLOR){
        interpreter.set("colorAttribEnabled", true);
        
        return null;
    }else{
        interpreter.flush();
    }
}

Tessellator.Enable.prototype.applyLighting = function (){
    return this.arg === Tessellator.LIGHTING;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.drawObject = Tessellator.Model.prototype.add;/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.end = function (indices){
    return this.add(new Tessellator.End(indices));
}

Tessellator.End = function (indices){
    this.type = Tessellator.END;
    this.indices = indices;
}

Tessellator.End.prototype.init = function (interpreter){
    this.shape = interpreter.shape;
    
    if (!this.shape){
        throw "cannot end a draw that had not started yet";
    }else if (!this.shape.vertices.length){
        this.shape = null;
        return null;
    }
    
    var textureBounds = null;
    
    if (interpreter.get("colorAttribEnabled")){
        textureBounds = interpreter.get("textureBounds");
    }
    
    if (this.shape.type === Tessellator.TEXTURE){
        if (textureBounds){
            textureBounds.bounds = this.shape.vertices.combine();
            textureBounds.defaultBounds = false;
        }
    }else if (this.shape.type === Tessellator.NORMAL){
        interpreter.normals = this.shape.vertices;
    }else if (this.shape.type === Tessellator.POINT){
        interpreter.flush();
        
        interpreter.model.push(this.shape);
    }else if (this.shape.type === Tessellator.POINT){
        interpreter.flush();
        
        if (this.indices){
            this.shape.indices.push(this.indices);
        }
        
        interpreter.model.push(this.shape);
    }else if (this.shape.type === Tessellator.LINE){
        interpreter.flush();
        
        if (this.indices){
            this.shape.indices.push(this.indices);
        }
        
        interpreter.model.push(this.shape);
        
        if (interpreter.get("lighting")){
            if (interpreter.normals){
                this.shape.normals.push(interpreter.normals);
                
                intrepreter.normals = null;
            }else{
                var vcache = this.shape.vertices;
                
                if (this.indices){
                    var norm = new Float32Array(vcache.length);
                    
                    for (var i = 0; i < this.indices.length; i += 2){
                        var i1 = this.shape.indices.get(i + 0) * 3;
                        var i2 = this.shape.indices.get(i + 1) * 3;
                        
                        var normal = Tessellator.vec3(
                            vcache.get(i1 + 0) - vcache.get(i2 + 0),
                            vcache.get(i1 + 1) - vcache.get(i2 + 1),
                            vcache.get(i1 + 2) - vcache.get(i2 + 2)
                        ).normalize();
                        
                        norm.set(normal, i1);
                        norm.set(normal, i2);
                    }
                    
                    this.shape.normals.push(norm);
                }else for (var i = 0; i < vcache.length; i += 6){
                    var normal = Tessellator.vec3(
                        vcache.get(i + 0) - vcache.get(i + 3),
                        vcache.get(i + 1) - vcache.get(i + 4),
                        vcache.get(i + 2) - vcache.get(i + 5)
                    ).normalize();
                    
                    this.shape.normals.push(normal);
                    this.shape.normals.push(normal);
                }
            }
        }
    }else{
        var vertexIndexes = this.shape.indices;
        
        var vertexOffset = 0;
        var shapeAddon = interpreter.get("drawCache");
        
        if (shapeAddon){
            vertexOffset = shapeAddon.vertices.length / 3;
        }
        
        if (this.indices){
            if (this.shape.type !== Tessellator.TRIANGLE){
                throw "vertex buffers only supported with triangles";
            }
            
            vertexIndexes.push(this.indices);
            vertexIndexes.offset(vertexOffset);
            
            if (textureBounds){
                if (textureBounds.defaultBounds){
                    var bounds = [
                                              0,                       0,
                        textureBounds.bounds[0],                       0,
                        textureBounds.bounds[1], textureBounds.bounds[1],
                    ];
                    
                    for (var i = 0, k = this.shape.vertices.length; i < k; i++){
                        this.shape.colors.push(bounds);
                    }
                }else{
                    this.shape.colors.push(textureBounds.bounds);
                }
            }
        }else if (this.shape.type === Tessellator.POLYGON){
        
        }else if (this.shape.type === Tessellator.QUAD){
            var k = this.shape.vertices.length;
            
            if (k % 12 !== 0){
                throw "invalid number of vertices for quad draw!";
            }else{
                k /= 3 * 4;
            }
            
            for (var i = 0; i < k; i++){
                vertexIndexes.push([
                    0 + i * 4 + vertexOffset,
                    1 + i * 4 + vertexOffset,
                    2 + i * 4 + vertexOffset,
                    
                    0 + i * 4 + vertexOffset,
                    2 + i * 4 + vertexOffset,
                    3 + i * 4 + vertexOffset,
                ]);
                
                if (textureBounds){
                    var bounds;
                    
                    if (textureBounds.defaultBounds){
                        bounds = [
                                                  0,                       0,
                            textureBounds.bounds[0],                       0,
                            textureBounds.bounds[0], textureBounds.bounds[1],
                                                  0, textureBounds.bounds[1],
                        ];
                    }else{
                        bounds = textureBounds.bounds.subarray(i * 8, (i + 1) * 8)
                    }
                    
                    this.shape.colors.push(bounds);
                }
            }
        }else if (this.shape.type === Tessellator.TRIANGLE){
            var k = this.shape.vertices.length;
            
            if (k % 9 !== 0){
                throw "vector length is invalid for triangles!";
            }else{
                k /= 3 * 3;
            }
            
            for (var i = 0; i < k; i++){
                vertexIndexes.push([
                    (i * 3) + vertexOffset + 0,
                    (i * 3) + vertexOffset + 1,
                    (i * 3) + vertexOffset + 2
                ]);
                
                if (textureBounds){
                    var bounds;
                    
                    if (textureBounds.defaultBounds){
                        bounds = [
                                                  0,                       0,
                            textureBounds.bounds[0],                       0,
                            textureBounds.bounds[1], textureBounds.bounds[1],
                        ];
                    }else{
                        bounds = textureBounds.bounds.subarray(i * 6, (i + 1) * 6);
                    }
                    
                    this.shape.colors.push(bounds);
                }
            }
        }else if (this.shape.type === Tessellator.TRIANGLE_STRIP){
            var k = this.shape.vertices.length / 3;
            
            if (k < 3){
                throw "not enough vertices to draw triangle strip."
            }
            
            if (textureBounds && !textureBounds.defaultBounds && textureBounds.bounds.length / 4 !== k){
                throw "bound texture coordinates length mismatch with vertices length!";
            }
            
            var indices = [];
            
            for (var i = 0; i < k; i++){
                if (i < 3){
                    indices.push(i + vertexOffset);
                }else{
                    indices.push(indices[indices.length - 2]);
                    indices.push(indices[indices.length - 2]);
                    indices.push(i                        + vertexOffset);
                }
                
                if (textureBounds){
                    var colorBoundsIndex = (i * 3) % textureBounds.length;
                    
                    if (i === 2){
                        var bounds;
                        
                        if (textureBounds.defaultBounds){
                            bounds = [
                                                      0,                       0,
                                textureBounds.bounds[0],                       0,
                                textureBounds.bounds[1], textureBounds.bounds[1],
                            ];
                        }else{
                            bounds = textureBounds.bounds.subarray(0, i * 3);
                        }
                        
                        this.shape.colors.push(bounds);
                    }else if (i >= 3){
                        var bounds;
                        
                        if (textureBounds.defaultBounds){
                            bounds = [
                                textureBounds.bounds[1], textureBounds.bounds[1], 0, 0,
                            ];
                        }else{
                            bounds = textureBounds.bounds.subarray(i * 3, (i + 1) * 3);
                        }
                        
                        this.shape.colors.push(bounds);
                    }
                }
            }
            
            vertexIndexes.push(indices);
        }else if (this.shape.type === Tessellator.TRIANGLE_FAN_CCW){
            var k = this.shape.vertices.length / 3;
            
            if (k < 3){
                throw "not enough vertices to draw triangle strip."
            }
            
            if (textureBounds && !textureBounds.defaultBounds && textureBounds.bounds.length / 4 !== k){
                throw "bound texture coordinates length mismatch with vertices length!";
            }
            
            var indices = [];
            
            for (var i = 0; i < k; i++){
                if (i < 3){
                    indices.push(i + vertexOffset);
                }else{
                    indices.push(indices[indices.length - 1]);
                    indices.push(indices[                 0]);
                    indices.push(i            + vertexOffset);
                }
                
                if (textureBounds){
                    var colorBoundsIndex = (i * 3) % textureBounds.length;
                    
                    if (i === 2){
                        var bounds;
                        
                        if (textureBounds.defaultBounds){
                            bounds = [
                                                      0,                       0,
                                textureBounds.bounds[0],                       0,
                                textureBounds.bounds[1], textureBounds.bounds[1],
                            ];
                        }else{
                            bounds = textureBounds.bounds.subarray(0, i * 3);
                        }
                        
                        this.shape.colors.push(bounds);
                    }else if (i >= 3){
                        var bounds;
                        
                        if (textureBounds.defaultBounds){
                            bounds = [
                                textureBounds.bounds[1], textureBounds.bounds[1],
                            ];
                        }else{
                            bounds = textureBounds.bounds.subarray(i * 3, (i + 1) * 3);
                        }
                        
                        this.shape.colors.push(bounds);
                    }
                }
            }
            
            vertexIndexes.push(indices);
        }else if (this.shape.type === Tessellator.TRIANGLE_FAN_CW){
            var k = this.shape.vertices.length / 3;
            
            if (k < 3){
                throw "not enough vertices to draw triangle strip."
            }
            
            if (textureBounds && !textureBounds.defaultBounds && textureBounds.bounds.length / 4 !== k){
                throw "bound texture coordinates length mismatch with vertices length!";
            }
            
            var indices = [];
            
            for (var i = 0; i < k; i++){
                if (i < 3){
                    indices.push(i + vertexOffset);
                }else{
                    indices.push(indices[                 0]);
                    indices.push(indices[indices.length - 2]);
                    indices.push(i            + vertexOffset);
                }
                
                if (textureBounds){
                    var colorBoundsIndex = (i * 3) % textureBounds.length;
                    
                    if (i === 2){
                        var bounds;
                        
                        if (textureBounds.defaultBounds){
                            bounds = [
                                                      0,                       0,
                                textureBounds.bounds[0],                       0,
                                textureBounds.bounds[1], textureBounds.bounds[1],
                            ];
                        }else{
                            bounds = textureBounds.bounds.slice(0, i * 3);
                        }
                        
                        this.shape.colors.push(bounds);
                    }else if (i >= 3){
                        var bounds;
                        
                        if (textureBounds.defaultBounds){
                            bounds = [
                                textureBounds.bounds[1], textureBounds.bounds[1],
                            ];
                        }else{
                            bounds = textureBounds.bounds.slice(i * 3, (i + 1) * 3);
                        }
                        
                        this.shape.colors.push(bounds);
                    }
                }
            }
            
            vertexIndexes.push(indices);
        }
        
        this.shape.type = Tessellator.TRIANGLE;
        
        if (interpreter.get("lighting")){
            if (interpreter.normals){
                this.shape.normals.push(interpreter.normals);
                
                interpreter.normals = null;
            }else{ //calculate default normals.
                var vertices = this.shape.vertices;
                var indices = this.shape.indices;
                var normals = new Float32Array(vertices.length);
                
                for (var i = 0, k = indices.length / 3; i < k; i++){
                    var
                        x1 = vertices.get((indices.get(i * 3 + 0) - vertexOffset) * 3 + 0),
                        y1 = vertices.get((indices.get(i * 3 + 0) - vertexOffset) * 3 + 1),
                        z1 = vertices.get((indices.get(i * 3 + 0) - vertexOffset) * 3 + 2),
                        
                        x2 = vertices.get((indices.get(i * 3 + 1) - vertexOffset) * 3 + 0),
                        y2 = vertices.get((indices.get(i * 3 + 1) - vertexOffset) * 3 + 1),
                        z2 = vertices.get((indices.get(i * 3 + 1) - vertexOffset) * 3 + 2),
                        
                        x3 = vertices.get((indices.get(i * 3 + 2) - vertexOffset) * 3 + 0),
                        y3 = vertices.get((indices.get(i * 3 + 2) - vertexOffset) * 3 + 1),
                        z3 = vertices.get((indices.get(i * 3 + 2) - vertexOffset) * 3 + 2);
                    
                    //deltas
                    var
                        Ux = x2 - x1,
                        Uy = y2 - y1,
                        Uz = z2 - z1,
                        
                        Vx = x3 - x1,
                        Vy = y3 - y1,
                        Vz = z3 - z1;
                    
                    //normals
                    var
                        Nx = (Uy * Vz) - (Uz * Vy),
                        Ny = (Uz * Vx) - (Ux * Vz),
                        Nz = (Ux * Vy) - (Uy * Vx);
                    
                    for (var l = 0; l < 3; l++){
                        var index = indices.get(i * 3 + l) - vertexOffset;
                        
                        normals[index * 3 + 0] = Nx;
                        normals[index * 3 + 1] = Ny;
                        normals[index * 3 + 2] = Nz;
                    }
                }
                
                this.shape.normals.push(normals);
            }
        }
        
        if (shapeAddon){
            //overflow. even WebGL has its limits.
            if (shapeAddon.indices.length + this.shape.indices.length > Tessellator.VERTEX_LIMIT){
                interpreter.model.push(shapeAddon);
                
                //reset vertex pointers to 0.
                this.shape.indices.offset(-vertexOffset);
                interpreter.set("drawCache", this.shape);
            }else{
                shapeAddon.indices.push(this.shape.indices);
                shapeAddon.vertices.push(this.shape.vertices);
                shapeAddon.colors.push(this.shape.colors);
                shapeAddon.normals.push(this.shape.normals);
            }
            
            this.shape.dispose();
        }else{
            interpreter.set("drawCache", this.shape);
        }
    }
    
    interpreter.shape = null;
    return null;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.setFontSheet = function (fontSheet){
    return this.add (new Tessellator.FontSheet(fontSheet));
}

Tessellator.FontSheet = function (fontSheet){
    this.type = Tessellator.FONT_SHEET;
    
    this.fontSheet = fontSheet;
}

Tessellator.FontSheet.prototype.init = function (interpreter){
    interpreter.set("fontSheet", this.fontSheet);
    
    return null;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Initializer.setDefault("lineWidth", function () {
    return 1;
});

Tessellator.Model.prototype.setLineWidth = function (width){
    return this.add (new Tessellator.LineWidth(width));
}

Tessellator.LineWidth = function (lineWidth){
    this.type = Tessellator.LINE_WIDTH;
    
    this.lineWidth = lineWidth;
}

Tessellator.LineWidth.prototype.apply = function (render){
    render.lineWidth(this.lineWidth);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Initializer.setDefault("mask", function () {
    return false;
});

Tessellator.Model.prototype.setMask = function (){
    return this.add(new Tessellator.MaskSet(Tessellator.getColor(arguments)));
}

Tessellator.MaskSet = function (color){
    this.type = Tessellator.MASK;
    
    this.mask = color;
}


Tessellator.MaskSet.prototype.init = function (interpreter){
    if (interpreter.get("draw") === Tessellator.TEXTURE){
        if (interpreter.shape){
            throw "cannot change mask while shape is being drawn";
        }
        
        interpreter.flush();
        
        interpreter.set("mask", true);
    }else{
        interpreter.set("color", new Tessellator.Color(
            interpreter.get("color").r * this.mask[0],
            interpreter.get("color").g * this.mask[1],
            interpreter.get("color").b * this.mask[2],
            interpreter.get("color").a * this.mask[3]
        ));
        
        return null;
    }
}


Tessellator.MaskSet.prototype.apply = function (render){
    render.set("mask", this.mask);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.rotate = function (){
    if (arguments.length === 1 && arguments[0].constructor === Tessellator.Rotate){
        return this.add(arguments[0]);
    }else{
        return this.add(Tessellator.new.apply(Tessellator.Rotate, arguments));
    }
}

Tessellator.Model.prototype.rotateDeg = function (){
    var rotate;
    
    if (arguments.length === 1 && arguments[0].constructor === Tessellator.Rotate){
        return this.add(arguments[0]);
    }else{
        arguments[0] *= Math.PI / 180;
        
        return this.add(Tessellator.new.apply(Tessellator.Rotate, arguments));
    }
    
    return this.add(rotate);
}

Tessellator.Rotate = function (){
    this.type = Tessellator.ROTATE;
    
    if (arguments.length === 0){
        this.degree = arguments[0];
        
        this.vec = Tessellator.vec3(0, 0, 0);
    }else if (arguments.length === 1){
        this.degree = arguments[0];
        
        this.vec = Tessellator.vec3(0, 0, 0);
    }else if (arguments.length === 2){
        this.degree = arguments[0];
        
        this.vec = arguments[1];
    }else if (arguments.length === 4){
        this.degree = arguments[0];
        
        this.vec = Tessellator.vec3(arguments[1], arguments[2], arguments[3]);
    }else{
        throw "invalid arguments in Tessellator.rotate()";
    }
    
    if (!this.degree.length){
        this.degree = Tessellator.float(this.degree);
    }
}

Tessellator.Rotate.prototype.apply = function (render){
    var m = render.get("mvMatrix");
    
    this.set(m);
}

Tessellator.Rotate.prototype.applyLighting = function (matrix){
    this.set(matrix);
}

Tessellator.Rotate.prototype.set = function (m){
    m.rotate(this.degree, this.vec);
}


Tessellator.Rotate.prototype.init = function (interpreter){
    interpreter.flush();
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.scale = function (){
    if (arguments.length === 1 && arguments[0].constructor === Tessellator.Scale){
        return this.add(arguments[0]);
    }else{
        return this.add(Tessellator.new.apply(Tessellator.Scale, arguments));
    }
}

Tessellator.Scale = function (){
    this.type = Tessellator.SCALE;
    
    var scale;
    
    if (arguments.length === 0){
        this.coords = Tessellator.vec3(0, 0, 0);
    }else if (arguments.length === 1){
        this.coords = Tessellator.vec3(arguments[0], arguments[0], arguments[0]);
    }else if (arguments.length === 2){
        this.coords = Tessellator.vec3(arguments[0], arguments[1], 0);
    }else if (arguments.length === 3){
        this.coords = Tessellator.vec3(arguments);
    }else{
        throw "invalid arguments in Tessellator.scale()";
    }
}

Tessellator.Scale.prototype.apply = function (render){
    var m = render.get("mvMatrix");
    
    this.set(m);
}

Tessellator.Scale.prototype.applyLighting = function (matrix){
    this.set(matrix);
}

Tessellator.Scale.prototype.set = function (m){
    m.scale(this.coords);
}

Tessellator.Scale.prototype.init = function (interpreter){
    interpreter.flush();
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Initializer.setDefault("colorAttribEnabled", function (){
    return true;
});

Tessellator.Model.prototype.start = function (type, drawType){
    return this.add(new Tessellator.Start(this.tessellator, type, drawType));
}

Tessellator.Start = function (tessellator, shapeType, drawType) {
    this.type = shapeType;
    this.subtype = Tessellator.VERTEX;
    
    this.drawType = drawType || Tessellator.STATIC;
    
    this.matrix = null;
    
    this.vertices = new Tessellator.FragmentedArray();
    this.normals = new Tessellator.FragmentedArray();
    this.colors = new Tessellator.FragmentedArray();
    
    this.object = new Tessellator.Object(tessellator);
    this.indices = this.object.getIndices();
    
    this.disposable = true;
}

Tessellator.Start.prototype.compress = function (){
    this.vertices.compress();
    this.indices.compress();
    this.normals.compress();
    this.colors.compress();
}

Tessellator.Start.prototype.init = function (interpreter){
    if (interpreter.shape){
        throw "cannot start new draw if the old one did not end yet";
    }else if (!this.type){
        throw "nothing to start";
    }
    
    if (this.type === Tessellator.LINE){
        interpreter.flush();
        interpreter.set("draw", Tessellator.LINE);
    }
    
    this.drawMode = interpreter.get("draw");
    
    interpreter.shape = this;
    return null;
}


Tessellator.Start.prototype.dispose = function (){
    this.object.dispose();
}

Tessellator.Start.prototype.apply = function (render){
    this.object.render(render);
}

Tessellator.Start.prototype.postInit = function (interpreter){
    if (interpreter.shape){
        throw "cannot finish a matrix when there are sill objects being drawn!";
    }
    
    this.object.setType(this.type);
    this.object.drawMode = this.drawMode;
    
    this.object.setAttribute("position", Tessellator.VEC3, this.vertices, Float32Array, false, this.drawType);
    if (this.normals.length) this.object.setAttribute("normal", Tessellator.VEC3, this.normals, Float32Array, false, this.drawType);
    
    if (this.drawMode === Tessellator.TEXTURE){
        this.object.setAttribute("color", Tessellator.VEC2, this.colors, Float32Array, false, this.drawType);
    }else{
       this.object.setAttribute("color", Tessellator.VEC4, this.colors, Uint8Array, true, this.drawType);
    }
    
    //upload everything to GPU
    this.end = this.vertices.length / 3;
    this.object.upload();
    this.object.useOES();
    
    this.vertices = null;
    this.indices = null;
    this.normals = null;
    this.colors = null;
}

Tessellator.Start.prototype.translate = function (x, y, z){
    if (!this.matrix){
        this.matrix = Tessellator.mat4().identity();
    }
    
    this.matrix.translate(Tessellator.vec3(x, y, z));
}

Tessellator.Start.prototype.scale = function (x, y, z){
    if (!this.matrix){
        this.matrix = Tessellator.mat4().identity();
    }
    
    this.matrix.scale(Tessellator.vec3(x, y, z));
}

Tessellator.Start.prototype.rotate = function (deg, x, y, z){
    if (!this.matrix){
        this.matrix = Tessellator.mat4().identity();
    }
    
    this.matrix.rotate(deg, Tessellator.vec3(x, y, z));
}

Tessellator.Start.prototype.setVertex = function (){
    Tessellator.Model.prototype.setVertex.apply(this.model, arguments);
}

Tessellator.Start.prototype.end = function (){
    Tessellator.Model.prototype.end.apply(this.model, arguments);
}

Tessellator.Start.prototype.getSubsection = function (start, end){
    if (!end){
        end = this.end;
    }
    
    if (end){
        return new Tessellator.Start.Subsection(this, start, end);
    }else{
        throw "cannot get subsection of incompatible type";
    }
}

{ //subsection
    Tessellator.Start.Subsection = function (parent, start, end){
        this.parent = parent;
        this.start = start;
        this.end = end;
    }
    
    Tessellator.Start.Subsection.prototype.getSubsection = function (start, end){
        return new Tessellator.Start.Subsection(this.parent, this.start + start, this.start + end)
    }
    
    Tessellator.Start.Subsection.prototype.setColor = function (){
        var delta = this.end - this.start;
        var color = this.parent.model.getColor.apply(this.parent.matrix, arguments);
        
        var array = new Uint8Array(delta * 4);
        
        for (var i = 0; i < delta; i++){
            array[i * 4 + 0] = color.r * 255;
            array[i * 4 + 1] = color.g * 255;
            array[i * 4 + 2] = color.b * 255;
            array[i * 4 + 3] = color.a * 255;
        }
        
        this.parent.object.setAttributeData("color", new Tessellator.Array(array), this.start * 4);
    }
    
    Tessellator.Start.Subsection.prototype.setVertex = function (){
        var vertices;
        
        if (arguments.length === 1){
            vertices = arguments[0];
        }else{
            vertices = arguments;
        }
        
        if (vertices.constructor !== Float32Array){
            vertices = new Tessellator.Array(new Float32Array(vertices));
        }
        
        this.parent.object.setAttributeData("position", vertices, this.start * 3);
    }
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.DEFAULT_FONT_SHEET = {
    src: "font.png",
    width: 16,
    height: 16,
    
    filter: Tessellator.TEXTURE_FILTER_LINEAR_CLAMP,
    
    //If this was not block text, this table would be used.
    //every value is from 1 to 0.
    widthTable: null,
};

Tessellator.createHandle.push(function () {
    this.DEFAULT_FONT_SHEET = {};
    
    for (var attrib in Tessellator.DEFAULT_FONT_SHEET){
        this.DEFAULT_FONT_SHEET[attrib] = Tessellator.DEFAULT_FONT_SHEET[attrib];
    }
});

Tessellator.Initializer.setDefault("fontSheet", function (interpreter) {
    return interpreter.tessellator.DEFAULT_FONT_SHEET;
});

Tessellator.Model.prototype.drawText = function (text, x, y){
    return this.add (new Tessellator.Text(this, text, x, y));
}

Tessellator.Text = function (matrix, text, x, y){
    this.type = Tessellator.TEXT;
    
    this.matrix = matrix;
    this.text = text;
    this.x = x;
    this.y = y;
}


Tessellator.Text.prototype.init = function (interpreter){
    if (this.text.length > 0){
        var fontSheet = interpreter.get("fontSheet");
        
        if (!fontSheet.texture){
            fontSheet.texture = interpreter.tessellator.createTexture(fontSheet.src, fontSheet.filter);
            fontSheet.texture.disposable = false;
        }
        
        var vertexTable = [];
        var textureCoordTable = [];
        var normals = [];
        
        var xOrigin = 0;
        var yOrigin = 0;
        
        if (this.x !== undefined && this.y !== undefined){
            xOrigin = this.x;
            yOrigin = this.y;
        }
        
        var xOffset = xOrigin;
        var yOffset = yOrigin;
        
        main:for (var i = 0, k = 0, l = this.text.length; i + k < l; i++){
            var j;
            
            w:while (true){
                j = i + k;
                
                if (i + k < l - 1){
                    if ((this.text.charAt(j) === '\r' && this.text.charAt(j + 1) === '\n') ||
                        (this.text.charAt(j) === '\n' && this.text.charAt(j + 1) === '\r')){
                        yOffset++;
                        xOffset = -i + xOrigin;
                        
                        k += 2;
                    }else if (this.text.charAt(j) === '\n' ||
                              this.text.charAt(j) === '\r'){
                        yOffset++;
                        xOffset = -i;
                        
                        k++;
                    }else{
                        break w;
                    }
                }else if (this.text.charAt(j) === '\n' ||
                          this.text.charAt(j) === '\r'){
                    break main;
                }else{
                    break w;
                }
            }
            
            var code = this.text.charCodeAt(j);
            
            var charWidth = 1;
            
            if (fontSheet.widthTable){
                charWidth = fontSheet.widthTable[code];
            }
            
            if (this.text.charAt(j) === ' '){
                k++;
                xOffset += charWidth;
                
                code = this.text.charCodeAt(j + 1);
                
                if (fontSheet.widthTable){
                    charWidth = fontSheet.widthTable[code];
                }
            }
            
            var cX = code % fontSheet.width;
            var cY = fontSheet.height - Math.floor(code / fontSheet.height);
            
            Array.prototype.push.apply(textureCoordTable, [
                1 / fontSheet.width * cX,
                1 / fontSheet.height * (cY - 1),
                1 / fontSheet.width * (cX + charWidth),
                1 / fontSheet.height * (cY - 1),
                1 / fontSheet.width * (cX + charWidth),
                1 / fontSheet.height * cY,
                1 / fontSheet.width * cX,
                1 / fontSheet.height * cY,
            ]);
            
            
            Array.prototype.push.apply(vertexTable, [
                          + xOffset, -1 - yOffset, 0,
                charWidth + xOffset, -1 - yOffset, 0,
                charWidth + xOffset,    - yOffset, 0,
                          + xOffset,    - yOffset, 0,
            ]);
            
            if (!interpreter.lightingEnabled){
                Array.prototype.push.apply (normals, [
                    0, 0, 0,
                    0, 0, 0,
                    0, 0, 0,
                    0, 0, 0,
                ]);
            }else{
                Array.prototype.push.apply (normals, [
                    0, 0, -1,
                    0, 0, -1,
                    0, 0, -1,
                    0, 0, -1,
                ]);
            }
            
            xOffset += charWidth;
        }
        
        this.matrix.bindTexture(fontSheet.texture);
        this.matrix.setMask(interpreter.get("color"));
        
        this.matrix.start(Tessellator.TEXTURE);
        this.matrix.setVertex(textureCoordTable);
        this.matrix.end(textureCoordTable);
        
        this.matrix.start(Tessellator.NORMAL);
        this.matrix.setVertex(normals);
        this.matrix.end();
        
        this.matrix.start(Tessellator.QUAD);
        this.matrix.setVertex(vertexTable);
        this.matrix.end();
    }
    
    return null;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.bindTexture = function (texture){
    return this.add(new Tessellator.TextureBind(texture));
}

Tessellator.TextureBind = function (texture){
    this.type = Tessellator.TEXTURE;
    this.texture = texture;
    
    this.disposable = true;
}

Tessellator.TextureBind.prototype.dispose = function (){
    if (this.texture && this.texture.disposable){
        this.texture.dispose();
    }
}

Tessellator.TextureBind.prototype.init = function (interpreter){
    if (interpreter.shape){
        throw "cannot bind a new texture if there is a shape currently being drawn.";
    }
    
    if (this.texture.constructor === String){
        this.texture = interpreter.tessellator.getTexture(this.texture);
    }
    
    interpreter.set("textureBounds", this);
    
    //this default will stretch the texture over the surface.
    this.bounds = [
        1, 1
    ];
    
    this.defaultBounds = true;
    
    interpreter.flush();
    interpreter.set("draw", Tessellator.TEXTURE);
    
    interpreter.set("mask", false);
}

Tessellator.TextureBind.prototype.postInit = Tessellator.EMPTY_FUNC;

Tessellator.TextureBind.prototype.apply = function (render, model){
    render.set("texture", this.texture);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.scaleTexture = function (){
    if (arguments.length == 1){
        return this.add(new Tessellator.TextureScale(arguments[0], arguments[0]));
    }else{
        return this.add(new Tessellator.TextureScale(arguments[0], arguments[1]));
    }
}

Tessellator.TextureScale = function (scaleX, scaleY) {
    this.type = Tessellator.TEXTURE_SCALE;
    
    this.scaleX = scaleX;
    this.scaleY = scaleY;
}

Tessellator.TextureScale.prototype.init = function (interpreter){
    if (interpreter.get("textureBounds") && interpreter.get("textureBounds").bounds){
        for (var i = 0, k = interpreter.get("textureBounds").bounds.length / 2; i < k; i++){
            interpreter.get("textureBounds").bounds[i * 2] *= this.scaleX;
            interpreter.get("textureBounds").bounds[i * 2 + 1] *= this.scaleY;
        }
    }
    
    return null;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.translateTexture = function (){
    if (arguments.length == 1){
        return this.add(new Tessellator.TextureTranslate(arguments[0], arguments[0]));
    }else{
        return this.add(new Tessellator.TextureTranslate(arguments[0], arguments[1]));
    }
}

Tessellator.TextureTranslate = function (x, y) {
    this.type = Tessellator.TEXTURE_SCALE;
    
    this.x = x;
    this.y = y;
}

Tessellator.TextureTranslate.prototype.init = function (interpreter){
    if (interpreter.get("textureBounds") && interpreter.get("textureBounds").bounds){
        for (var i = 0, k = interpreter.get("textureBounds").bounds.length / 2; i < k; i++){
            interpreter.get("textureBounds").bounds[i * 2] += this.x;
            interpreter.get("textureBounds").bounds[i * 2 + 1] += this.y;
        }
    }
    
    return null;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.translate = function(){
    if (arguments.length === 1 && arguments[0].constructor === Tessellator.Translate){
        return this.add(arguments[0]);
    }else{
        return this.add(Tessellator.new.apply(Tessellator.Translate, arguments));
    }
}

Tessellator.Translate = function (){
    this.type = Tessellator.TRANSLATE;
    
    if (arguments.length === 0){
        this.pos = Tessellator.vec3(0, 0, 0);
    }else if (arguments.length === 1){
        if (!isNaN(arguments[0])){
            this.pos = Tessellator.vec3(arguments[0], arguments[0], arguments[0]);
        }else{
            this.pos = arguments[0];
        }
    }else if (arguments.length === 2){
        this.pos = Tessellator.vec3(arguments[0], arguments[1], 0);
    }else if (arguments.length === 3){
        this.pos = Tessellator.vec3(arguments[0], arguments[1], arguments[2]);
    }else{
        throw "invalid arguments in Tessellator.Translate()";
    }
}

Tessellator.Translate.prototype.apply = function (render){
    var m = render.get("mvMatrix");
    
    this.set(m);
}

Tessellator.Translate.prototype.applyLighting = function (matrix){
    this.set(matrix);
}

Tessellator.Translate.prototype.set = function (m){
    m.translate(this.pos);
}

Tessellator.Translate.prototype.init = function (interpreter){
    interpreter.flush();
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.setUniform = function (key, value){
    return this.add(new Tessellator.Model.UniformSetter(key, value));
}

Tessellator.Model.UniformSetter = function (key, value){
    this.key = key;
    this.value = value;
}

Tessellator.Model.UniformSetter.prototype.init = function (init){
    init.flush();
}

Tessellator.Model.UniformSetter.prototype.apply = function (matrix){
    matrix.set(this.key, this.value);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Initializer.setDefault ("draw", function (){
    return Tessellator.COLOR;
});

Tessellator.Initializer.prototype.flush = function (){
    if (this.get("drawCache")){
        var cache = this.getr("drawCache");
        
        this.model.push(cache);
        
        return cache;
    }
    
    return null;
}

Tessellator.Model.prototype.setVertex = function(){
    if (arguments.length === 1){
        return this.add(new Tessellator.Vertex(arguments[0]));
    }else{
        return this.add(new Tessellator.Vertex(arguments));
    }
}

Tessellator.Vertex = function (vertices){
    this.type = Tessellator.VERTEX;
    
    this.vertices = vertices;
}


Tessellator.Vertex.prototype.init = function (interpreter){
    if (interpreter.shape === null){
        throw "cannot add vertices to a non existing shape";
    }
    
    if (interpreter.shape.type === Tessellator.TEXTURE){
        if (this.vertices.length){
            interpreter.shape.vertices.push(this.vertices);
        }
    }else if (interpreter.shape.type === Tessellator.NORMAL){
        if (this.vertices.length){
            interpreter.shape.vertices.push(this.vertices);
        }
    }else{
        if (this.vertices.length){
            if (interpreter.get("colorAttribEnabled") && interpreter.get("draw") !== Tessellator.TEXTURE){
                var k = this.vertices.length / 3;
                var c = interpreter.get("color255");
                
                for (var i = 0; i < k; i++){
                    interpreter.shape.colors.push(c);
                }
            }
            
            if (interpreter.shape.matrix){
                var ver = this.vertices;
                var m = interpreter.shape.matrix;
                
                for (var i = 0, k = ver.length / 3; i < k; i++){
                    var
                        x = ver[i * 3 + 0],
                        y = ver[i * 3 + 1],
                        z = ver[i * 3 + 2];
                    
                    ver[i * 3 + 0] = m[ 0] * x + m[ 4] * y + m[ 8] * z + m[12];
                    ver[i * 3 + 1] = m[ 1] * x + m[ 5] * y + m[ 9] * z + m[13];
                    ver[i * 3 + 2] = m[ 2] * x + m[ 6] * y + m[10] * z + m[14];
                }
            }
        
            interpreter.shape.vertices.push(this.vertices);
            interpreter.shape.items += k;
        }
    }
    
    return null;
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.setView = Tessellator.Model.prototype.add;/**
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


//strict mode can be used with this.
"use strict";

Tessellator.PerspectiveView = function (){
    this.type = Tessellator.VIEW;
    
    if (arguments.length === 0){
        this.FOV = Tessellator.DEFAULT_FOV;
        this.farView = Tessellator.DEFAULT_FAR_VIEW;
        this.nearView = Tessellator.DEFAULT_NEAR_VIEW;
    }else if (arguments.length === 1){
        this.FOV = arguments[0];
        
        this.farView = Tessellator.DEFAULT_FAR_VIEW;
        this.nearView = Tessellator.DEFAULT_NEAR_VIEW;
    }else if (arguments.length === 2){
        this.FOV = arguments[0];
        this.farView = arguments[1];
        
        this.nearView = Tessellator.DEFAULT_NEAR_VIEW;
    }else if (arguments.length === 3){
        this.FOV = arguments[0];
        this.farView = arguments[1];
        this.nearView = arguments[2];
    }else if (arguments.length === 4){
        this.FOV = arguments[0];
        this.farView = arguments[1];
        this.nearView = arguments[2];
        this.aspectRatio = arguments[3];
    }else{
        throw "too many arguments!";
    }
    
    if (this.farView < this.nearView){
        console.error("The perspective far view is shorter then the near view. This is probably not intentional. " + this.farView + ":" + this.nearView);
    }
}

Tessellator.PerspectiveView.prototype.apply = function (render){
    var aspectRatio = this.aspectRatio;
    
    render.set("nearView", this.nearView);
    render.set("farView", this.farView);
    
    if (!aspectRatio){
        aspectRatio = render.get("window").aspect();
    }
    
    var
        f = 1 / Math.tan(this.FOV / 2),
        nf = this.nearView - this.farView;
    
    render.set("pMatrix", Tessellator.mat4(
        f / aspectRatio, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (this.farView + this.nearView) / nf, -1,
        0, 0, (2 * this.farView * this.nearView) / nf, 0
    ));
}
            
Tessellator.PerspectiveView.prototype.init = function (interpreter){
    interpreter.flush();
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.OrthographicView = function (){
    this.type = Tessellator.VIEW;
    this.args = arguments.length;
    
    if (this.args === 1){
        this.farView = Tessellator.DEFAULT_FAR_VIEW;
        this.nearView = Tessellator.DEFAULT_NEAR_VIEW;
        
        var v = arguments[0];
        
        this.left = -v;
        this.right = v;
        this.up = -v;
        this.down = v;
    }else if (this.args === 2){
        this.right = arguments[0];
        this.up = -arguments[1];
        
        this.farView = Tessellator.DEFAULT_FAR_VIEW;
        this.nearView = Tessellator.DEFAULT_NEAR_VIEW;
    }else if (this.args === 4){
        this.left = arguments[0];
        this.right = arguments[1];
        this.up = arguments[2];
        this.down = arguments[3];
        
        this.farView = Tessellator.DEFAULT_FAR_VIEW;
        this.nearView = Tessellator.DEFAULT_NEAR_VIEW;
    }else if (this.args === 5){
        this.left = arguments[0];
        this.right = arguments[1];
        this.up = arguments[2];
        this.down = arguments[3];
        
        this.farView = arguments[4];
        
        this.nearView = Tessellator.DEFAULT_NEAR_VIEW;
    }else if (this.args === 6){
        this.left = arguments[0];
        this.right = arguments[1];
        this.up = arguments[2];
        this.down = arguments[3];
        
        this.farView = arguments[4];
        this.nearView = arguments[5];
    }else{
        throw "invalid arguments!";
    }
}

Tessellator.OrthographicView.prototype.apply = function (render){
    var
        left = this.left,
        right = this.right,
        up = this.up,
        down = this.down;
    
    if (this.args === 1){
        var window = render.get("window");
        
        if (window[1] > window[0]){
            var aspect = window[1] / window[0];
            
            up *= aspect;
            down *= aspect;
        }else{
            var aspect = window[0] / window[1];
            
            left *= aspect;
            right *= aspect;
        }
    }
    
    render.set("nearView", this.nearView);
    render.set("farView", this.farView);
    
    var
        dx = 1 / (left - right),
        dy = 1 / (up - down),
        dz = 1 / (this.nearView - this.farView);
    
    render.set("pMatrix", Tessellator.mat4(
        -2 * dx, 0, 0, 0,
        0, -2 * dy, 0, 0,
        0, 0, 2 * dz, 0,
        (left + right) * dx, (down + up) * dy, (this.farView + this.nearView) * dz, 1
    ));
}


Tessellator.OrthographicView.prototype.init = function (interpreter){
    interpreter.flush();
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.ClipSpaceView = function (){
    this.type = Tessellator.VIEW;
}

Tessellator.ClipSpaceView.prototype.apply = function (render){
    render.set("pMatrix", Tessellator.mat4().identity());
}

Tessellator.ClipSpaceView.prototype.init = function (interpreter){
    interpreter.flush();
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.StaticView = function (x, y){
    this.type = Tessellator.VIEW;
    
    this.x = x || Tessellator.LEFT;
    this.y = y || Tessellator.TOP;
}

Tessellator.StaticView.prototype.apply = function (render){
    var window = render.get("window");
    
    var yoff, xoff;
    
    if (isNaN(this.x)){
        xoff = this.x.value;
    }else{
        xoff = this.x;
    }
    
    if (isNaN(this.y)){
        yoff = this.y.value;
    }else{
        yoff = this.y;
    }
    
    render.set("pMatrix", Tessellator.mat4(
        2 / window[0], 0, 0, 0,
        0, 2 / window[1], 0, 0,
        0, 0, 0, 0,
        xoff, yoff, -1, 1
    ));
}

Tessellator.StaticView.prototype.init = function (interpreter){
    interpreter.flush();
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Camera = function (view){
    this.type = Tessellator.VIEW;
    this.subtype = Tessellator.CAMERA;
    
    this.view = view;
}

Tessellator.Camera.prototype.apply = function (render){
    this.view.apply(render);
}

Tessellator.Camera.prototype.applyLighting = function (matrix){
    if (this.view.applyLighting) this.view.applyLighting(matrix);
}

Tessellator.Camera.prototype.init = function (interpreter){
    this.view.init(interpreter);
}

Tessellator.Camera.prototype.postInit = function (interpreter){
    this.view.postInit(renderer);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.DirectionalCamera = function (){
    this.type = Tessellator.VIEW;
    this.subtype = Tessellator.CAMERA;
    this.view = arguments[0];
    
    if (arguments.length === 4){
        this.vec = Tessellator.vec3(arguments[1], arguments[2], arguments[3]);
        this.up = Tessellator.vec3(0, 1, 0);
    }else if (arguments.length === 7){
        this.vec = Tessellator.vec3(arguments[1], arguments[2], arguments[3]);
        this.up = Tessellator.vec3(arguments[4], arguments[5], arguments[6]);
    }else{
        this.vec = arguments[1];
        this.up = arguments[2] !== undefined ? arguments[2] : Tessellator.vec3(0, 1, 0);
    }
}

Tessellator.DirectionalCamera.prototype.applyLighting = function (matrix){
    if (this.view.applyLighting) this.view.applyLighting(matrix);
    
    this.set(matrix);
}

Tessellator.DirectionalCamera.prototype.apply = function (render){
    this.view.apply(render);
    this.set(render.get("mvMatrix"));
}

Tessellator.DirectionalCamera.prototype.set = function (m){
    m.rotateVec(this.vec, this.up);
}

Tessellator.DirectionalCamera.prototype.init = function (interpreter){
    this.view.init(interpreter)
}

Tessellator.DirectionalCamera.prototype.postInit = function (interpreter){
    this.view.postInit(interpreter);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.RadialCamera = function (view, radX, radY, lock){
    this.type = Tessellator.VIEW;
    this.subtype = Tessellator.CAMERA;
    this.view = view;
    this.radX = radX === undefined ? Tessellator.float() : (isNaN(radX) ? radX : Tessellator.float(radX)); //yaw
    this.radY = radY === undefined ? Tessellator.float() : (isNaN(radY) ? radY : Tessellator.float(radY)); //pitch
    
    this.lock = lock;
}

Tessellator.RadialCamera.prototype.x = function (){
    return this.radX.x();
}

Tessellator.RadialCamera.prototype.y = function (){
    return this.radY.x();
}

Tessellator.RadialCamera.prototype.apply = function (render){
    this.view.apply(render);
    
    this.set(render.exists("mvMatrix") ? render.get("mvMatrix") : render.get("pMatrix"));
}

Tessellator.RadialCamera.prototype.applyLighting = function (matrix){
    if (this.view.applyLighting) this.view.applyLighting(matrix);
    
    this.set(matrix);
}

Tessellator.RadialCamera.prototype.set = function (m){
    if (this.lock){
        if (this.radY.x() < -Math.PI / 2 + 0.001){
            this.radY[0] = -Math.PI / 2 + 0.001;
        }else if (this.radY[0] > Math.PI / 2 - 0.001){
            this.radY[0] = Math.PI / 2 - 0.001;
        }
    }
    
    m.rotateVec(Tessellator.vec3().pitchyaw(this.radY, this.radX), Tessellator.vec3(0, 1, 0));
}

Tessellator.RadialCamera.prototype.init = function (interpreter){
    this.view.init(interpreter)
}

Tessellator.RadialCamera.prototype.postInit = function (interpreter){
    this.view.postInit(interpreter);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.TranslationCamera = function (view, x, y, z){
    this.type = Tessellator.VIEW;
    this.subtype = Tessellator.CAMERA;
    
    this.view = view;
    
    if (arguments.length === 2){
        this.pos = x;
    }else{
        this.pos = Tessellator.vec3(x, y, z);
    }
}

Tessellator.TranslationCamera.prototype.applyLighting = function (matrix){
    if (this.view.applyLighting) this.view.applyLighting(matrix);
    
    this.set(matrix);
}

Tessellator.TranslationCamera.prototype.apply = function (render){
    this.view.apply(render);
    
    this.set(render.exists("mvMatrix") ? render.get("mvMatrix") : render.get("pMatrix"));
}

Tessellator.TranslationCamera.prototype.set = function (m){
    m.translate(this.pos.clone().negate());
}

Tessellator.TranslationCamera.prototype.init = function (interpreter){
    this.view.init(interpreter);
}

Tessellator.TranslationCamera.prototype.postInit = function (interpreter){
    this.view.postInit(interpreter);
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Initializer.setDefault("lighting", function () {
    return true;
});/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.setAmbientLight = function (){
    return this.add(new Tessellator.AmbientLight());
}

Tessellator.AmbientLight = function (){
    this.type = Tessellator.LIGHTING_AMBIENT;
    this.subtype = Tessellator.LIGHTING;
}


Tessellator.AmbientLight.prototype.set = function (lighting, index, matrix){
    if (this.color.tween) this.color.tween.update();
    
    lighting[0 + index] = 1;
    lighting[1 + index] = this.color[0] * this.color[3];
    lighting[2 + index] = this.color[1] * this.color[3];
    lighting[3 + index] = this.color[2] * this.color[3];
}

Tessellator.AmbientLight.prototype.applyLighting = function (matrix, index, renderer){
    this.set(renderer.lightingTexture.data, index[0] * 4 * 4, matrix);
    
    if (index[0]++ * 4 * 4 >= renderer.lightingTexture.data.length){
        throw "too many lights!";
    }
}

Tessellator.AmbientLight.prototype.init = function (interpreter){
    this.color = interpreter.get("color");
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.setDirectionalLight = function (){
    return this.add(Tessellator.new.apply(Tessellator.DirectionalLight, arguments));
}

Tessellator.DirectionalLight = function (){
    if (arguments.length === 1){
        this.vec = arguments[0];
    }else if (arguments.length === 3){
        this.vec = Tessellator.vec3(arguments);
    }else{
        throw "invalid arguments in Tessellator.DirectionLight";
    }
    
    this.type = Tessellator.LIGHTING_DIRECTIONAL;
    this.subtype = Tessellator.LIGHTING;
    
}

Tessellator.DirectionalLight.prototype.set = function (lighting, index, matrix){
    if (this.color.tween) this.color.tween.update();
    
    lighting[0 + index] = 2;
    lighting[1 + index] = this.color[0] * this.color[3];
    lighting[2 + index] = this.color[1] * this.color[3];
    lighting[3 + index] = this.color[2] * this.color[3];
    
    var vec = this.vec.clone().rotate(matrix).normalize();
    
    lighting[4 + index] = vec[0];
    lighting[5 + index] = vec[1];
    lighting[6 + index] = vec[2];
}

Tessellator.DirectionalLight.prototype.applyLighting = function (matrix, index, renderer){
    this.set(renderer.lightingTexture.data, index[0] * 4 * 4, matrix);
    
    if (index[0]++ * 4 * 4 >= renderer.lightingTexture.data.length){
        throw "too many lights!";
    }
}

Tessellator.DirectionalLight.prototype.init = function (interpreter){
    this.color = interpreter.get("color");
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.setPointLight = function (){
    return this.add(Tessellator.new.apply(Tessellator.PointLight, arguments));
}

Tessellator.PointLight = function (){
    if (arguments.length === 1 || arguments.length === 2){
        this.pos = arguments[0];
        var range = arguments[1];
        
        if (range === undefined || isNaN(range)){
            this.range = range;
        }else{
            this.range = Tessellator.float(range);
        }
    }else if (arguments.length === 3 || arguments.length === 4){
        this.pos = Tessellator.vec3(arguments[0], arguments[1], arguments[2]);
        var range = arguments[3];
        
        if (range === undefined || isNaN(range)){
            this.range = range;
        }else{
            this.range = Tessellator.float(range);
        }
    }else{
        throw "invalid arguments in Tessellator.PointLight";
    }
    
    this.type = Tessellator.LIGHTING_POINT;
    this.subtype = Tessellator.LIGHTING;
}

Tessellator.PointLight.prototype.set = function (lighting, index, matrix){
    if (this.color.tween) this.color.tween.update();
    
    lighting[1 + index] = this.color[0] * this.color[3];
    lighting[2 + index] = this.color[1] * this.color[3];
    lighting[3 + index] = this.color[2] * this.color[3];
    
    var vec = this.pos.clone().multiply(matrix);
    lighting[4 + index] = vec[0];
    lighting[5 + index] = vec[1];
    lighting[6 + index] = vec[2];
    
    if (this.range){
        lighting[0 + index] = 4;
        
        lighting[7 + index] = Math.abs(this.range.x());
    }else{
        lighting[0 + index] = 3;
    }
    
    return 2;
}

Tessellator.PointLight.prototype.applyLighting = function (matrix, index, renderer){
    this.set(renderer.lightingTexture.data, index[0] * 4 * 4, matrix);
    
    if (index[0]++ * 4 * 4 >= renderer.lightingTexture.data.length){
        throw "too many lights!";
    }
}

Tessellator.PointLight.prototype.init = function (interpreter){
    this.color = interpreter.get("color");
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.setSpecularReflection = function (reflection){
    this.add(new Tessellator.SpecularLight(reflection));
}

Tessellator.SpecularLight = function (intensity){
    this.type = Tessellator.LIGHTING_SPECULAR;
    this.subtype = Tessellator.LIGHTING;
    
    this.intensity = isNaN(intensity) ? intensity : Tessellator.float(intensity);
}

Tessellator.SpecularLight.prototype.init = function (interpreter){
    interpreter.flush();
}

Tessellator.SpecularLight.prototype.apply = function (render){
    render.set("specular", this.intensity.x());
}/**
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


//strict mode can be used with this.
"use strict";

Tessellator.Model.prototype.setSpotLight = function (){
    return this.add(Tessellator.new.apply(Tessellator.SpotLight, arguments));
}

Tessellator.SpotLight = function (){
    if (arguments.length === 3 || arguments.length === 4){
        this.pos = arguments[0];
        this.vec = arguments[1];
        this.angle = isNaN(arguments[2]) ? arguments[2] : Tessellator.float(arguments[2]);
        
        var range = arguments[3];
        
        if (range === undefined || isNaN(range)){
            this.range = range;
        }else{
            this.range = Tessellator.float(range);
        }
    }else if (arguments.length === 7 || arguments.length === 8){
        this.pos = Tessellator.vec3(arguments[0], arguments[1], arguments[2]);
        this.vec = Tessellator.vec3(arguments[3], arguments[4], arguments[5]);
        this.angle = isNaN(arguments[6]) ? arguments[6] : Tessellator.float(arguments[6]);
        
        var range = arguments[7];
        
        if (range === undefined || isNaN(range)){
            this.range = range;
        }else{
            this.range = Tessellator.float(range);
        }
    }
    
    this.type = Tessellator.LIGHTING_SPOT;
    this.subtype = Tessellator.LIGHTING;
}

Tessellator.SpotLight.prototype.set = function (lighting, index, matrix){
    if (this.color.tween) this.color.tween.update();
    
    lighting[1 + index] = this.color[0] * this.color[3];
    lighting[2 + index] = this.color[1] * this.color[3];
    lighting[3 + index] = this.color[2] * this.color[3];
    
    var pos = this.pos.clone().multiply(matrix);
    lighting[4 + index] = pos[0];
    lighting[5 + index] = pos[1];
    lighting[6 + index] = pos[2];
    
    var vec = this.vec.clone().rotate(matrix);
    lighting[8  + index] = vec[0];
    lighting[9  + index] = vec[1];
    lighting[10 + index] = vec[2];
    if (!this.range){
        lighting[0 + index] = 5;
        
        lighting[11 + index] = this.angle.x();
    }else{
        lighting[0 + index] = 6;
        
        lighting[7 + index] = Math.abs(this.range.x());
        lighting[11 + index] = this.angle.x();
    }
}

Tessellator.SpotLight.prototype.applyLighting = function (matrix, index, renderer){
    this.set(renderer.lightingTexture.data, index[0] * 4 * 4, matrix);
    
    if (index[0]++ * 4 * 4 >= renderer.lightingTexture.data.length){
        throw "too many lights!";
    }
}

Tessellator.SpotLight.prototype.init = function (interpreter){
    this.color = interpreter.get("color");
}/**
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


//strict mode can be used with this.
"use strict";

if (document.registerElement){
    document.registerElement("tessellator-webgl");
}

window.addEventListener("load", function () {
    var elems = Array.prototype.slice.call(document.getElementsByTagName("tessellator-webgl"));
    
    while (elems.length){
        (function (elem){
            var canvas = document.createElement("canvas");
            canvas.style.display = "block";
            
            var context;
            
            if (elem.getAttribute("args")){
                context = "{" + elem.getAttribute("args").replace(/'/g, '"') + "}";
                context = JSON.parse(context);
            }
            
            if (!canvas.style.width && !canvas.style.height){
                canvas.style.width = "100%";
                canvas.style.height = "100%";
            }
            
            {
                var styleStr = elem.getAttribute("style");
                
                if (styleStr){
                    styleStr = styleStr.split(";");
                    
                    for (var ii = 0, kk = styleStr.length; ii < kk; ii++){
                        var index = styleStr[ii].indexOf(":");
                        
                        if (index > 0){
                            canvas.style[styleStr[ii].substring(0, index)] = styleStr[ii].substring(index + 1);
                        }
                    }
                }
            }
            
            var js = ["(function (tessellator){"];
            
            var loader = function (){
                while (elem.childNodes.length){
                    var node = elem.removeChild(elem.childNodes[0]);
                    
                    if (node.nodeType === node.TEXT_NODE){
                        js.push(node.textContent);
                    }else if (node.type === "run"){
                        Tessellator.getSourceText(node, function (text){
                            js.push(text);
                            
                            loader();
                        });
                        
                        return;
                    }else{
                        canvas.appendChild(node);
                    }
                }
                
                js.push("})(window.WILDCARD_TESSELLATOR_OBJ);");
                elem.parentNode.replaceChild(canvas, elem);
                
                window.WILDCARD_TESSELLATOR_OBJ = new Tessellator(canvas, context);
                window.eval(js.join(""));
                delete window.WILDCARD_TESSELLATOR_OBJ;
            }
            
            loader();
        })(elems.shift());
    }
});