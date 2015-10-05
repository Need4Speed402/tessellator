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
 
 Tessellator.Geometry.registerCustomGeometry(Tessellator.TRIANGLE_FAN, Tessellator.TRIANGLES, function (g, add, arg){
  if (g.indices.length){
      var off = add ? add.positions.length / 3 : 0;
      
      var ii = g.indices.combine(Uint16Array);
      var k = ii.length;
      var newIndices = new Tessellator.Array();
      
      for (var i = 2; i < k; i++){
          newIndices.push([
              ii[0] + off, 
              ii[i - 1] + off,
              ii[i - 0] + off
          ]);
      };
      
      g.indices = newIndices;
  }else{
      var k = g.positions.length / 3;
      var off = add ? add.positions.length / 3 : 0;
      
      for (var i = 2; i < k; i++){
          g.indices.push([
              0 + off, 
              i - 1 + off,
              i - 0 + off
          ]);
      };
  };
});