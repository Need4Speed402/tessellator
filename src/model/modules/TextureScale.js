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

Tessellator.Model.prototype.scaleTexture = function (){
    if (arguments.length == 1){
        return this.add(new Tessellator.Model.TextureScale(arguments[0], arguments[0]));
    }else{
        return this.add(new Tessellator.Model.TextureScale(arguments[0], arguments[1]));
    };
};

Tessellator.Model.TextureScale = function (scaleX, scaleY) {
    this.scaleX = scaleX;
    this.scaleY = scaleY;
};

Tessellator.Model.TextureScale.prototype.init = function (interpreter){
    interpreter.flush();
    
    var tb = interpreter.get("textureBounds");
    
    if (tb && tb.bounds){
        for (var i = 0, k = tb.bounds.length / 2; i < k; i++){
            tb.bounds[i * 2] *= this.scaleX;
            tb.bounds[i * 2 + 1] *= this.scaleY;
        };
    };
    
    return null;
};