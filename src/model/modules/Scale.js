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

Tessellator.Model.prototype.scale = function (){
    return this.add(Tessellator.new.apply(Tessellator.Model.Scale, arguments));
};

Tessellator.Model.Scale = function (){
    if (arguments.length === 0){
        this.coords = Tessellator.vec3(0, 0, 0);
    }else if (arguments.length === 1){
        if (!isNaN(arguments[0])){
            this.coords = Tessellator.vec3(arguments[0], arguments[0], arguments[0]);
        }else if (arguments[0].length === 1){
            if (arguments[0].constructor === Tessellator.float){
                this.coords = arguments[0];
            }else{
                this.coords = Tessellator.float(arguments[0]);
            };
        }else{
            this.coords = arguments[0];
        };
    }else if (arguments.length === 2){
        this.coords = Tessellator.vec3(arguments[0], arguments[1], 0);
    }else if (arguments.length === 3){
        this.coords = Tessellator.vec3(arguments);
    }else{
        throw "invalid arguments in Tessellator.scale()";
    };
};

Tessellator.Model.Scale.prototype.apply = function (render){
    var m = render.get("mvMatrix");
    
    this.set(m);
};

Tessellator.Model.Scale.prototype.applyLighting = function (matrix){
    this.set(matrix);
};

Tessellator.Model.Scale.prototype.set = function (m){
    var c;
    
    if (this.coords.constructor === Tessellator.float){
        c = Tessellator.vec3(this.coords);
    }else{
        c = this.coords;
    };
    
    m.scale(c);
};

Tessellator.Model.Scale.prototype.init = function (interpreter){
    interpreter.flush();
};