/**
 * FIXME FIXME FIXME
 *
 * This file is derived from the concatenation of
 * cadet-frontend/public/externalLibs/graphics/{webGLgraphics.js,webGLrune.js},
 * followed by:
 * - importing ./gl-matrix.js, which is copied from the frontend verbatim
 * - importing node-canvas-webgl, and substituting DOM calls with calls to it
 *
 */

var glm = require('./gl-matrix.js')
var mat4 = glm.mat4
var vec3 = glm.vec3

var nodecanvaswebgl = require('node-canvas-webgl')

function alert(msg) {
  throw new Error(msg)
}

// BEGIN modified webGLgraphics.js and webGLrune.js

//-----------------------Shaders------------------------------
var shaders = {}

shaders['2d-vertex-shader'] = [
  'attribute vec4 a_position;',

  'attribute vec4 a_mat1;',
  'attribute vec4 a_mat2;',
  'attribute vec4 a_mat3;',
  'attribute vec4 a_mat4;',
  'attribute vec4 a_color;',

  'varying vec4 v_color;',

  'void main() {',
  '    mat4 transformMatrix = mat4(a_mat1, a_mat2, a_mat3, a_mat4);',
  '    gl_Position = transformMatrix * a_position;',
  // correct the right/left handed thing
  '    gl_Position.z = -gl_Position.z;',
  '    v_color = a_color;',
  '}'
].join('\n')

shaders['2d-fragment-shader'] = [
  'precision mediump float;',

  'varying vec4 v_color;',

  'void main() {',
  '    gl_FragColor = v_color;',
  '}'
].join('\n')

shaders['3d-vertex-shader'] = [
  'attribute vec4 a_position;',

  'attribute vec4 a_mat1;',
  'attribute vec4 a_mat2;',
  'attribute vec4 a_mat3;',
  'attribute vec4 a_mat4;',
  'attribute vec4 a_color;',

  'varying vec4 v_color;',

  'void main() {',
  '    mat4 transformMatrix = mat4(a_mat1, a_mat2, a_mat3, a_mat4);',
  '    vec4 final_pos = transformMatrix * a_position;',
  // Correct the left-handed / right-handed stuff
  '    final_pos.z = -final_pos.z;',
  '    gl_Position = final_pos;',
  '    v_color = a_color;',
  '    float color_factor = final_pos.z;',
  '    v_color += color_factor * (1.0 - v_color);',
  '    v_color.a = 1.0;',
  '}'
].join('\n')

shaders['3d-fragment-shader'] = [
  'precision mediump float;',

  'varying vec4 v_color;',

  'void main() {',
  '    gl_FragColor = v_color;',
  '}'
].join('\n')

shaders['anaglyph-vertex-shader'] = [
  'attribute vec4 a_position;',

  'attribute vec4 a_mat1;',
  'attribute vec4 a_mat2;',
  'attribute vec4 a_mat3;',
  'attribute vec4 a_mat4;',
  'attribute vec4 a_color;',

  'uniform mat4 u_cameraMatrix;',
  'uniform vec4 u_colorFilter;',

  'varying vec4 v_color;',

  'void main() {',
  '    mat4 transformMatrix = mat4(a_mat1, a_mat2, a_mat3, a_mat4);',
  '    vec4 world_pos = transformMatrix * a_position;',
  '    gl_Position = u_cameraMatrix * world_pos;',
  // Correct the left-handed / right-handed stuff
  '    gl_Position.z = -gl_Position.z;',
  '    v_color = a_color;',
  '    float color_factor = -world_pos.z;',
  '    v_color += color_factor * (1.0 - v_color);',
  // average green and blue to form true cyan
  // v_color.g = 0.5 * (v_color.g + v_color.b);
  // v_color.b = v_color.g;
  // v_color = 1.0 - v_color;
  '    v_color = u_colorFilter * v_color + 1.0 - u_colorFilter;',
  '    v_color.a = 1.0;',
  '}'
].join('\n')

shaders['anaglyph-fragment-shader'] = [
  'precision mediump float;',

  'varying vec4 v_color;',

  'void main() {',
  '    gl_FragColor = v_color;',
  '}'
].join('\n')

shaders['combine-vertex-shader'] = [
  'attribute vec4 a_position;',

  'varying highp vec2 v_texturePosition;',

  'void main() {',
  '    gl_Position = a_position;',
  '    v_texturePosition.x = (a_position.x + 1.0) / 2.0;',
  '    v_texturePosition.y = (a_position.y + 1.0) / 2.0;',
  '}'
].join('\n')

shaders['combine-fragment-shader'] = [
  'precision mediump float;',

  'uniform sampler2D u_sampler_red;',
  'uniform sampler2D u_sampler_cyan;',

  'varying highp vec2 v_texturePosition;',

  'void main() {',
  '    gl_FragColor = texture2D(u_sampler_red, v_texturePosition)',
  '            + texture2D(u_sampler_cyan, v_texturePosition) - 1.0;',
  '    gl_FragColor.a = 1.0;',
  '}'
].join('\n')

shaders['copy-vertex-shader'] = [
  'attribute vec4 a_position;',

  'varying highp vec2 v_texturePosition;',

  'void main() {',
  '    gl_Position = a_position;',
  '    v_texturePosition.x = (a_position.x + 1.0) / 2.0;',
  '    v_texturePosition.y = 1.0 - (a_position.y + 1.0) / 2.0;',
  '}'
].join('\n')

shaders['copy-fragment-shader'] = [
  'precision mediump float;',

  'uniform sampler2D u_sampler_image;',

  'varying highp vec2 v_texturePosition;',

  'void main() {',
  '    gl_FragColor = texture2D(u_sampler_image, v_texturePosition);',
  '}'
].join('\n')

shaders['curve-vertex-shader'] = [
  'attribute vec2 a_position;',
  'uniform mat4 u_transformMatrix;',

  'void main() {',
  '    gl_PointSize = 2.0;',
  '    gl_Position = u_transformMatrix * vec4(a_position, 0, 1);',
  '}'
].join('\n')

shaders['curve-fragment-shader'] = [
  'precision mediump float;',

  'void main() {',
  '    gl_FragColor = vec4(0, 0, 0, 1);',
  '}'
].join('\n')

//-------------------------Constants-------------------------
var antialias = 4 // common
var halfEyeDistance = 0.03 // rune 3d only

//----------------------Global variables----------------------
// common
var stringify // stringify function we should use (eg for error messages)
var gl // the WebGL context
var curShaderProgram // the shader program currently in use
var normalShaderProgram // the default shader program
var vertexBuffer
var vertexPositionAttribute // location of a_position
var colorAttribute // location of a_color
var canvas = canvas || createCanvas(); // the <canvas> object that is used to display webGL output

// rune 2d and 3d
var instance_ext // ANGLE_instanced_arrays extension
var instanceBuffer
var indexBuffer
var indexSize // number of bytes per element of index buffer
var mat1Attribute // location of a_mat1
var mat2Attribute // location of a_mat2
var mat3Attribute // location of a_mat3
var mat4Attribute // location of a_mat4

// rune 3d only
var anaglyphShaderProgram
var combineShaderProgram
var copyShaderProgram
var u_cameraMatrix // locatin of u_cameraMatrix
var u_colorFilter // location of u_colorFilter
var redUniform // location of u_sampler_red
var cyanUniform // location of u_sampler_cyan
var u_sampler_image
var leftCameraMatrix // view matrix for left eye
var rightCameraMatrix // view matrix for right eye
var leftFramebuffer
var rightFramebuffer
var copyTexture

//----------------------Common functions----------------------
function open_viewport(name, horiz, vert, aa_off) {
  var canvas
  canvas = open_pixmap(name, horiz, vert, aa_off)
  return canvas
}

function open_pixmap(name, horiz, vert, aa_off) {
  var this_aa
  if (aa_off) {
    this_aa = 1
  } else {
    this_aa = antialias
  }
  var canvas = nodecanvaswebgl.createCanvas()
  canvas.id = 'main-canvas'
  //this part uses actual canvas impl.
  canvas.width = horiz * this_aa
  canvas.height = vert * this_aa
  return canvas
}

/**
 * Creates a <canvas> object. Should only be called once.
 *
 * Post-condition: canvas is defined as the selected <canvas>
 *   object in the document.
 */
function createCanvas() {
  const canvas = nodecanvaswebgl.createCanvas(512, 512)
  return canvas;
}

function getReadyStringifyForRunes(stringify_) {
  stringify = stringify_
}

/*
 * Gets the WebGL object (gl) ready for usage. Use this
 * to reset the mode of rendering i.e to change from 2d to 3d runes.
 *
 * Post-condition: gl is non-null, uses an appropriate
 *   program and has an appropriate initialized state
 *   for mode-specific rendering (e.g props for 3d render).
 *
 * @param mode a string -- '2d'/'3d'/'curve' that is the usage of
 *   the gl object.
 */
function getReadyWebGLForCanvas(mode) {
  // Get the rendering context for WebGL
  if (!canvas) {
    canvas = createCanvas();
  }
  gl = initWebGL(canvas)
  if (gl) {
    gl.clearColor(1.0, 1.0, 1.0, 1.0) // Set clear color to white, fully opaque
    gl.enable(gl.DEPTH_TEST) // Enable depth testing
    gl.depthFunc(gl.LEQUAL) // Near things obscure far things
    // Clear the color as well as the depth buffer.
    clear_viewport()

    //TODO: Revise this, it seems unnecessary
    // Align the drawable canvas in the middle
    gl.viewport((canvas.width - canvas.height) / 2, 0, canvas.height, canvas.height)

    // setup a GLSL program i.e. vertex and fragment shader
    if (!(normalShaderProgram = initShader(mode))) {
      return
    }
    curShaderProgram = normalShaderProgram
    gl.useProgram(curShaderProgram)

    // rune-specific operations
    if (mode === '2d' || mode === '3d') {
      initRuneCommon()
      initRuneBuffer(vertices, indices)
      initRune3d()
    }

    if (mode === 'curve') {
      initCurveAttributes(curShaderProgram)
    }
  }
}

function getReadyWebGL(mode, name, horiz, vert, aa_off) {
  // mode can be "2d", "3d" or "curve"
  // Create <canvas> element
  var canvas = open_viewport(name, horiz, vert, aa_off)

  // Get the rendering context for WebGL
  gl = initWebGL(canvas)
  if (gl) {
    gl.clearColor(1.0, 1.0, 1.0, 1.0) // Set clear color to white, fully opaque
    gl.enable(gl.DEPTH_TEST) // Enable depth testing
    gl.depthFunc(gl.LEQUAL) // Near things obscure far things
    // Clear the color as well as the depth buffer.
    clear_viewport()

    //TODO: Revise this, it seems unnecessary
    // Align the drawable canvas in the middle
    gl.viewport((canvas.width - canvas.height) / 2, 0, canvas.height, canvas.height)

    // setup a GLSL program i.e. vertex and fragment shader
    if (!(normalShaderProgram = initShader(mode))) {
      return
    }
    curShaderProgram = normalShaderProgram
    gl.useProgram(curShaderProgram)

    // rune-specific operations
    if (mode === '2d' || mode === '3d') {
        initRuneCommon()
        initRune3d()
    }

    if (mode === 'curve') {
      initCurveAttributes(curShaderProgram)
    }
  }
}

function initWebGL(canvas) {
  var gl = nodecanvaswebgl.createCanvas(512, 512).getContext('webgl')

  // If we don't have a GL context, give up now
  if (!gl) {
    alert('Unable to initialize WebGL. Your browser may not support it.')
    gl = null
  }
  return gl
}

function initShader(programName) {
  var vertexShader
  if (!(vertexShader = getShader(gl, programName + '-vertex-shader', 'vertex'))) {
    return null
  }
  var fragmentShader
  if (!(fragmentShader = getShader(gl, programName + '-fragment-shader', 'fragment'))) {
    return null
  }
  var shaderProgram = gl.createProgram()
  gl.attachShader(shaderProgram, vertexShader)
  gl.attachShader(shaderProgram, fragmentShader)
  gl.bindAttribLocation(shaderProgram, 0, 'a_position')
  gl.linkProgram(shaderProgram)
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program.')
    return null
  } else {
    return shaderProgram
  }
}

function getShader(gl, id, type) {
  var shader
  var theSource = shaders[id]

  if (type == 'fragment') {
    shader = gl.createShader(gl.FRAGMENT_SHADER)
  } else if (type == 'vertex') {
    shader = gl.createShader(gl.VERTEX_SHADER)
  } else {
    // Unknown shader type
    return null
  }

  gl.shaderSource(shader, theSource)

  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader))
    return null
  }
  return shader
}

function initFramebufferObject() {
  var framebuffer, texture, depthBuffer

  // Define the error handling function
  var error = function() {
    if (framebuffer) gl.deleteFramebuffer(framebuffer)
    if (texture) gl.deleteTexture(texture)
    if (depthBuffer) gl.deleteRenderbuffer(depthBuffer)
    return null
  }

  // create a framebuffer object
  framebuffer = gl.createFramebuffer()
  if (!framebuffer) {
    console.log('Failed to create frame buffer object')
    return error()
  }

  // create a texture object and set its size and parameters
  texture = gl.createTexture()
  if (!texture) {
    console.log('Failed to create texture object')
    return error()
  }
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    texture
  )
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  framebuffer.texture = texture

  // create a renderbuffer for depth buffer
  depthBuffer = gl.createRenderbuffer()
  if (!depthBuffer) {
    console.log('Failed to create renderbuffer object')
    return error()
  }

  // bind renderbuffer object to target and set size
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer)
  gl.renderbufferStorage(
    gl.RENDERBUFFER,
    gl.DEPTH_COMPONENT16,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight
  )

  // set the texture object to the framebuffer object
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer) // bind to target
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  // set the renderbuffer object to the framebuffer object
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer)

  // check whether the framebuffer is configured correctly
  var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
  if (gl.FRAMEBUFFER_COMPLETE !== e) {
    console.log('Frame buffer object is incomplete:' + e.toString())
    return error()
  }

  // Unbind the buffer object
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindTexture(gl.TEXTURE_2D, null)
  gl.bindRenderbuffer(gl.RENDERBUFFER, null)

  return framebuffer
}

function clearFramebuffer(framebuffer) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  clear_viewport()
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

function clear_viewport() {
  if (!gl) {
    throw new Error('Please activate the Canvas component by clicking it in the sidebar')
  }
  // Clear the viewport as well as the depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  if (typeof clearHollusion !== 'undefined') {
    clearHollusion()
  }
}

//---------------------Rune 2d and 3d functions---------------------
function initRuneCommon() {
  // set up attribute locations
  vertexPositionAttribute = gl.getAttribLocation(normalShaderProgram, 'a_position')
  colorAttribute = gl.getAttribLocation(normalShaderProgram, 'a_color')
  mat1Attribute = gl.getAttribLocation(normalShaderProgram, 'a_mat1')
  mat2Attribute = gl.getAttribLocation(normalShaderProgram, 'a_mat2')
  mat3Attribute = gl.getAttribLocation(normalShaderProgram, 'a_mat3')
  mat4Attribute = gl.getAttribLocation(normalShaderProgram, 'a_mat4')

  enableInstanceAttribs()

  // set up ANGLE_instanced_array extension
  if (!(instance_ext = gl.getExtension('ANGLE_instanced_arrays'))) {
    console.log('Unable to set up ANGLE_instanced_array extension!')
  }
}

function enableInstanceAttribs() {
  gl.enableVertexAttribArray(colorAttribute)
  gl.enableVertexAttribArray(mat1Attribute)
  gl.enableVertexAttribArray(mat2Attribute)
  gl.enableVertexAttribArray(mat3Attribute)
  gl.enableVertexAttribArray(mat4Attribute)
}

function disableInstanceAttribs() {
  gl.disableVertexAttribArray(colorAttribute)
  gl.disableVertexAttribArray(mat1Attribute)
  gl.disableVertexAttribArray(mat2Attribute)
  gl.disableVertexAttribArray(mat3Attribute)
  gl.disableVertexAttribArray(mat4Attribute)
}

function initRuneBuffer(vertices, indices) {
  // vertices should be Float32Array
  // indices should be Uint16Array
  vertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

  // enable assignment to vertex attribute
  gl.enableVertexAttribArray(vertexPositionAttribute)

  var FSIZE = vertices.BYTES_PER_ELEMENT
  gl.vertexAttribPointer(vertexPositionAttribute, 4, gl.FLOAT, false, FSIZE * 4, 0)

  // Also initialize the indexBuffer
  indexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

  indexSize = indices.BYTES_PER_ELEMENT
}

function drawRune(first, indexCount, instanceArray) {
  // instanceArray should be Float32Array
  // instanceCount should be instanceArray.length / 20

  // this draw function uses the "normal" shader
  if (curShaderProgram !== normalShaderProgram) {
    curShaderProgram = normalShaderProgram
    gl.useProgram(curShaderProgram)
  }

  enableInstanceAttribs()

  // due to a bug in ANGLE implementation on Windows
  // a new buffer need to be created everytime for a new instanceArray
  // drawing mode MUST be STREAM_DRAW
  // delete the buffer at the end
  // More info about the ANGLE implementation (which helped me fix this bug)
  // https://code.google.com/p/angleproject/wiki/BufferImplementation
  instanceBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, instanceArray, gl.STREAM_DRAW)

  var FSIZE = instanceArray.BYTES_PER_ELEMENT
  var instanceCount = instanceArray.length / 20

  // pass transform matrix and color of instances
  assignRuneAttributes(FSIZE)

  instance_ext.drawElementsInstancedANGLE(
    gl.TRIANGLES,
    indexCount,
    gl.UNSIGNED_SHORT,
    first * indexSize,
    instanceCount
  )

  // delete the instance buffer
  gl.deleteBuffer(instanceBuffer)
}

function assignRuneAttributes(FSIZE) {
  gl.vertexAttribPointer(mat1Attribute, 4, gl.FLOAT, false, FSIZE * 20, 0)
  instance_ext.vertexAttribDivisorANGLE(mat1Attribute, 1)
  gl.vertexAttribPointer(mat2Attribute, 4, gl.FLOAT, false, FSIZE * 20, FSIZE * 4)
  instance_ext.vertexAttribDivisorANGLE(mat2Attribute, 1)
  gl.vertexAttribPointer(mat3Attribute, 4, gl.FLOAT, false, FSIZE * 20, FSIZE * 8)
  instance_ext.vertexAttribDivisorANGLE(mat3Attribute, 1)
  gl.vertexAttribPointer(mat4Attribute, 4, gl.FLOAT, false, FSIZE * 20, FSIZE * 12)
  instance_ext.vertexAttribDivisorANGLE(mat4Attribute, 1)
  gl.vertexAttribPointer(colorAttribute, 4, gl.FLOAT, false, FSIZE * 20, FSIZE * 16)
  instance_ext.vertexAttribDivisorANGLE(colorAttribute, 1)
}

//------------------------Rune 3d functions------------------------
function initRune3d() {
  // set up other shaders
  if (
    !(
      (anaglyphShaderProgram = initShader('anaglyph')) &&
      (combineShaderProgram = initShader('combine'))
    )
  ) {
    console.log('Anaglyph cannot be used!')
  }
  if (!(copyShaderProgram = initShader('copy'))) {
    console.log('Stereogram and hollusion cannot be used!')
  }

  // set up uniform locations
  u_cameraMatrix = gl.getUniformLocation(anaglyphShaderProgram, 'u_cameraMatrix')
  u_colorFilter = gl.getUniformLocation(anaglyphShaderProgram, 'u_colorFilter')
  redUniform = gl.getUniformLocation(combineShaderProgram, 'u_sampler_red')
  cyanUniform = gl.getUniformLocation(combineShaderProgram, 'u_sampler_cyan')
  u_sampler_image = gl.getUniformLocation(copyShaderProgram, 'u_sampler_image')

  // calculate the left and right camera matrices
  leftCameraMatrix = mat4.create()
  mat4.lookAt(
    leftCameraMatrix,
    vec3.fromValues(-halfEyeDistance, 0, 0),
    vec3.fromValues(0, 0, -0.4),
    vec3.fromValues(0, 1, 0)
  )
  rightCameraMatrix = mat4.create()
  mat4.lookAt(
    rightCameraMatrix,
    vec3.fromValues(halfEyeDistance, 0, 0),
    vec3.fromValues(0, 0, -0.4),
    vec3.fromValues(0, 1, 0)
  )
  // set up frame buffers
  if (
    !((leftFramebuffer = initFramebufferObject()) && (rightFramebuffer = initFramebufferObject()))
  ) {
    console.log('Unable to initialize for anaglyph.')
    return
  }

  // set up a texture for copying
  // create a texture object and set its size and parameters
  copyTexture = gl.createTexture()
  if (!copyTexture) {
    console.log('Failed to create texture object')
    return error()
  }
}

function draw3D(first, indexCount, instanceArray, cameraMatrix, colorFilter, framebuffer) {
  // this draw function uses the "anaglyph" shader
  if (curShaderProgram !== anaglyphShaderProgram) {
    curShaderProgram = anaglyphShaderProgram
    gl.useProgram(curShaderProgram)
  }

  enableInstanceAttribs()

  // due to a bug in ANGLE implementation on Windows
  // a new buffer need to be created everytime for a new instanceArray
  // drawing mode MUST be STREAM_DRAW
  // delete the buffer at the end
  // More info about the ANGLE implementation (which helped me fix this bug)
  // https://code.google.com/p/angleproject/wiki/BufferImplementation
  instanceBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, instanceArray, gl.STREAM_DRAW)

  var FSIZE = instanceArray.BYTES_PER_ELEMENT
  var instanceCount = instanceArray.length / 20

  // pass transform matrix and color of instances
  assignRuneAttributes(FSIZE)

  // pass the camera matrix and color filter for left eye
  gl.uniformMatrix4fv(u_cameraMatrix, false, cameraMatrix)
  gl.uniform4fv(u_colorFilter, new Float32Array(colorFilter))

  // draw left eye to frame buffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  instance_ext.drawElementsInstancedANGLE(
    gl.TRIANGLES,
    indexCount,
    gl.UNSIGNED_SHORT,
    first * indexSize,
    instanceCount
  )

  gl.deleteBuffer(instanceBuffer)
}

function drawAnaglyph(first, indexCount, instanceArray) {
  // instanceArray should be Float32Array
  // instanceCount should be instanceArray.length / 20

  draw3D(first, indexCount, instanceArray, leftCameraMatrix, [1, 0, 0, 1], leftFramebuffer)
  draw3D(first, indexCount, instanceArray, rightCameraMatrix, [0, 1, 1, 1], rightFramebuffer)

  // combine to screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  combine(leftFramebuffer.texture, rightFramebuffer.texture)
}

function combine(texA, texB) {
  // this draw function uses the "combine" shader
  if (curShaderProgram !== combineShaderProgram) {
    curShaderProgram = combineShaderProgram
    gl.useProgram(curShaderProgram)
  }

  disableInstanceAttribs()

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texA)
  gl.uniform1i(cyanUniform, 0)

  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, texB)
  gl.uniform1i(redUniform, 1)

  gl.drawElements(gl.TRIANGLES, square.count, gl.UNSIGNED_SHORT, indexSize * square.first)
}

function clearAnaglyphFramebuffer() {
  clearFramebuffer(leftFramebuffer)
  clearFramebuffer(rightFramebuffer)
}

function copy_viewport_webGL(src) {
  // this draw function uses the "copy" shader
  if (curShaderProgram !== copyShaderProgram) {
    curShaderProgram = copyShaderProgram
    gl.useProgram(curShaderProgram)
  }

  disableInstanceAttribs()

  gl.activeTexture(gl.TEXTURE2)
  gl.bindTexture(gl.TEXTURE_2D, copyTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.uniform1i(u_sampler_image, 2)

  gl.drawElements(gl.TRIANGLES, square.count, gl.UNSIGNED_SHORT, indexSize * square.first)
}
//---------------------Cheating canvas functions-----------------
function copy_viewport(src, dest) {
  dest.getContext('2d').clearRect(0, 0, dest.width, dest.height)
  dest.getContext('2d').drawImage(src, 0, 0, dest.width, dest.height) // auto scaling
}

//------------------------Curve functions------------------------
function initCurveAttributes(shaderProgram) {
  vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'a_position')
  gl.enableVertexAttribArray(vertexPositionAttribute)
  u_transformMatrix = gl.getUniformLocation(shaderProgram, 'u_transformMatrix')
}

function drawCurve(drawMode, curvePosArray) {
  var magicNum = 60000
  var itemSize = 2
  for (var i = 0; i <= curvePosArray.length / magicNum / itemSize; i++) {
    // since webGL only supports 16bits buffer, i.e. the no. of
    // points in the buffer must be lower than 65535, so I take
    // 60000 as the "magic number"
    var subArray = curvePosArray.slice(i * magicNum * itemSize, (i + 1) * magicNum * itemSize)
    vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(subArray), gl.STATIC_DRAW)
    gl.vertexAttribPointer(vertexPositionAttribute, itemSize, gl.FLOAT, false, 0, 0)

    if (drawMode == 'lines') {
      gl.drawArrays(gl.LINE_STRIP, 0, subArray.length / itemSize)
    } else {
      gl.drawArrays(gl.POINTS, 0, subArray.length / itemSize)
    }

    gl.deleteBuffer(vertexBuffer)
  }
}

function ShapeDrawn(canvas) {
  this.$canvas = canvas;
}
var rune_viewport_size = 512 // This is the height of the viewport
// while a curve is approximated by a polygon,
// the side of the polygon will be no longer than maxArcLength pixels
var maxArcLength = 20

/*-----------------------Some class definitions----------------------*/
function PrimaryRune(first, count) {
  this.isPrimary = true // this is a primary rune
  this.first = first // the first index in the index buffer
  // that belongs to this rune
  this.count = count // number of indices to draw the rune
  this.toReplString = () => '<RUNE>'
}

function Rune() {
  this.isPrimary = false
  this.transMatrix = mat4.create()
  this.runes = []
  this.color = undefined
  this.toReplString = () => '<RUNE>'
}

// set the transformation matrix related to the rune
Rune.prototype.setM = function(matrix) {
  this.transMatrix = matrix
}

// get the transformation matrix related to the rune
Rune.prototype.getM = function() {
  return this.transMatrix
}

// get the sub-runes (array) of the rune
Rune.prototype.getS = function() {
  return this.runes
}

Rune.prototype.setS = function(runes) {
  this.runes = runes
}

Rune.prototype.addS = function(rune) {
  this.runes.push(rune)
}

Rune.prototype.getColor = function() {
  return this.color
}

Rune.prototype.setColor = function(color) {
  this.color = color
}

/*-----------------Initialize vertex and index buffer----------------*/
// vertices is an array of points
// Each point has the following attribute, in that order:
// x, y, z, t
// (will be converted to Float32Array later)
var vertices = [
  // center
  0.0,
  0.0,
  0.0,
  1.0,
  // 4 corners and 4 sides' midpoints
  1.0,
  0.0,
  0.0,
  1.0,
  1.0,
  1.0,
  0.0,
  1.0,
  0.0,
  1.0,
  0.0,
  1.0,
  -1.0,
  1.0,
  0.0,
  1.0,
  -1.0,
  0.0,
  0.0,
  1.0,
  -1.0,
  -1.0,
  0.0,
  1.0,
  0.0,
  -1.0,
  0.0,
  1.0,
  1.0,
  -1.0,
  0.0,
  1.0,
  // for rcross
  0.5,
  0.5,
  0.0,
  1.0,
  -0.5,
  0.5,
  0.0,
  1.0,
  -0.5,
  -0.5,
  0.0,
  1.0,
  0.5,
  -0.5,
  0.0,
  1.0,
  // for nova
  0.0,
  0.5,
  0.0,
  1.0,
  -0.5,
  0.0,
  0.0,
  1.0
]
// indices is an array of indices, each refer to a point in vertices
// (will be converted to Uint16Array later)
var indices = [
  // square
  2,
  4,
  6,
  2,
  6,
  8,
  // rcross
  2,
  4,
  10,
  2,
  9,
  10,
  2,
  9,
  12,
  2,
  12,
  8,
  10,
  11,
  12,
  // sail
  7,
  8,
  3,
  // corner
  1,
  2,
  3,
  // nova
  3,
  0,
  14,
  13,
  0,
  1
]

function makeCircle() {
  // draw a polygon with many vertices to approximate a circle
  var centerVerInd = 0
  var firstVer = vertices.length / 4
  var firstInd = indices.length
  var numPoints = Math.ceil(Math.PI * rune_viewport_size / maxArcLength)
  // generate points and store it in the vertex buffer
  for (var i = 0; i < numPoints; i++) {
    var angle = Math.PI * 2 * i / numPoints
    vertices.push(Math.cos(angle), Math.sin(angle), 0, 1)
  }
  // generate indices for the triangles and store in the index buffer
  for (var i = firstVer; i < firstVer + numPoints - 1; i++) {
    indices.push(centerVerInd, i, i + 1)
  }
  indices.push(centerVerInd, firstVer, firstVer + numPoints - 1)
  var count = 3 * numPoints
  return new PrimaryRune(firstInd, count)
}

function makeHeart() {
  var bottomMidInd = 7
  var firstVer = vertices.length / 4
  var firstInd = indices.length
  var root2 = Math.sqrt(2)
  var r = 4 / (2 + 3 * root2)
  var scaleX = 1 / (r * (1 + root2 / 2))
  var numPoints = Math.ceil(Math.PI / 2 * rune_viewport_size * r / maxArcLength)
  // right semi-circle
  var rightCenterX = r / root2
  var rightCenterY = 1 - r
  for (var i = 0; i < numPoints; i++) {
    var angle = Math.PI * (-1 / 4 + i / numPoints)
    vertices.push(
      (Math.cos(angle) * r + rightCenterX) * scaleX,
      Math.sin(angle) * r + rightCenterY,
      0,
      1
    )
  }
  // left semi-circle
  var leftCenterX = -r / root2
  var leftCenterY = 1 - r
  for (var i = 0; i <= numPoints; i++) {
    var angle = Math.PI * (1 / 4 + i / numPoints)
    vertices.push(
      (Math.cos(angle) * r + leftCenterX) * scaleX,
      Math.sin(angle) * r + leftCenterY,
      0,
      1
    )
  }
  // update index buffer
  for (var i = firstVer; i < firstVer + 2 * numPoints; i++) {
    indices.push(bottomMidInd, i, i + 1)
  }
  var count = 3 * 2 * numPoints
  return new PrimaryRune(firstInd, count)
}

function makePentagram() {
  var firstVer = vertices.length / 4
  var firstInd = indices.length

  var v1 = Math.sin(Math.PI / 10)
  var v2 = Math.cos(Math.PI / 10)

  var w1 = Math.sin(3 * Math.PI / 10)
  var w2 = Math.cos(3 * Math.PI / 10)

  vertices.push(v2, v1, 0, 1)
  vertices.push(w2, -w1, 0, 1)
  vertices.push(-w2, -w1, 0, 1)
  vertices.push(-v2, v1, 0, 1)
  vertices.push(0, 1, 0, 1)

  for (var i = 0; i < 5; i++) {
    indices.push(0, firstVer + i, firstVer + (i + 2) % 5)
  }

  return new PrimaryRune(firstInd, 15)
}

function makeRibbon() {
  var firstVer = vertices.length / 4
  var firstInd = indices.length

  var theta_max = 30
  var thickness = -1 / theta_max
  var unit = 0.1

  for (var i = 0; i < theta_max; i += unit) {
    vertices.push(i / theta_max * Math.cos(i), i / theta_max * Math.sin(i), 0, 1)
    vertices.push(
      Math.abs(Math.cos(i) * thickness) + i / theta_max * Math.cos(i),
      Math.abs(Math.sin(i) * thickness) + i / theta_max * Math.sin(i),
      0,
      1
    )
  }

  var totalPoints = Math.ceil(theta_max / unit) * 2

  for (var i = firstVer; i < firstVer + totalPoints - 2; i++) {
    indices.push(i, i + 1, i + 2)
  }

  return new PrimaryRune(firstInd, 3 * totalPoints - 6)
}

/**
 * primitive Rune in the rune of a full square
**/
var square = new PrimaryRune(0, 6)

/**
 * primitive Rune in the rune of a blank square
**/
var blank = new PrimaryRune(0, 0)

/**
 * primitive Rune in the rune of a
 * smallsquare inside a large square,
 * each diagonally split into a
 * black and white half
**/
var rcross = new PrimaryRune(6, 15)

/**
 * primitive Rune in the rune of a sail
**/
var sail = new PrimaryRune(21, 3)

/**
 * primitive Rune with black triangle,
 * filling upper right corner
**/
var corner = new PrimaryRune(24, 3)

/**
 * primitive Rune in the rune of two overlapping
 * triangles, residing in the upper half
 * of
**/
var nova = new PrimaryRune(27, 6)

/**
 * primitive Rune in the rune of a circle
**/
var circle = makeCircle()

/**
 * primitive Rune in the rune of a heart
**/
var heart = makeHeart()

/**
 * primitive Rune in the rune of a pentagram
**/
var pentagram = makePentagram()

/**
 * primitive Rune in the rune of a ribbon
 * winding outwards in an anticlockwise spiral
**/
var ribbon = makeRibbon()

// convert vertices and indices to typed arrays
vertices = new Float32Array(vertices)
indices = new Uint16Array(indices)

/*-----------------------Drawing functions----------------------*/
function generateFlattenedRuneList(rune) {
  var matStack = []
  var matrix = mat4.create()
  var rune_list = {}
  function pushMat() {
    matStack.push(mat4.clone(matrix))
  }
  function popMat() {
    if (matStack.length == 0) {
      throw 'Invalid pop matrix!'
    } else {
      matrix = matStack.pop()
    }
  }
  function helper(rune, color) {
    throwIfNotRune('primitive rune function', rune)
    if (rune.isPrimary) {
      if (rune.count === 0) {
        // this is blank, do nothing
        return
      }
      if (!rune_list[rune.first]) {
        rune_list[rune.first] = {
          rune: rune,
          matrices: [],
          colors: []
        }
      }
      rune_list[rune.first].matrices.push(matrix)
      rune_list[rune.first].colors.push(color || [0, 0, 0, 1])
    } else {
      if (color === undefined && rune.getColor() !== undefined) {
        color = rune.getColor()
      }
      pushMat()
      mat4.multiply(matrix, matrix, rune.getM())
      var childRunes = rune.getS()
      for (var i = 0; i < childRunes.length; i++) {
        helper(childRunes[i], color)
      }
      popMat()
    }
  }
  function flatten(matrices, colors) {
    var instanceArray = new Float32Array(matrices.length * 20)
    for (var i = 0; i < matrices.length; i++) {
      instanceArray.set(matrices[i], 20 * i)
      instanceArray.set(colors[i], 20 * i + 16)
    }
    return instanceArray
  }
  helper(rune)
  var flattened_rune_list = []
  // draw a white square background first
  flattened_rune_list.push({
    rune: square,
    instanceArray: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1, 1, 1, 1, 1, 1])
  })
  for (var key in rune_list) {
    if (rune_list.hasOwnProperty(key)) {
      var rune = rune_list[key].rune
      var instanceArray = flatten(rune_list[key].matrices, rune_list[key].colors)
      flattened_rune_list.push({ rune: rune, instanceArray: instanceArray })
    }
  }
  return flattened_rune_list
}

function drawWithWebGL(flattened_rune_list, drawFunction) {
  for (var i = 0; i < flattened_rune_list.length; i++) {
    var rune = flattened_rune_list[i].rune
    var instanceArray = flattened_rune_list[i].instanceArray
    drawFunction(rune.first, rune.count, instanceArray)
  }
}

function isRune(x) {
  return x instanceof Rune || x instanceof PrimaryRune
}

function throwIfNotRune(name, x) {
  for (var rune of Array.prototype.slice.call(arguments, 1)) {
    if (!isRune(rune)) {
      throw name + ' expects a rune as argument, received ' + stringify(rune)
    }
  }
}

/**
 * turns a given Rune into a two-dimensional Picture
 * @param {Rune} rune - given Rune
 * @return {Picture}
 * If the result of evaluating a program is a Picture,
 * the REPL displays it graphically, instead of textually.
 */

function show(rune) {
  throwIfNotRune('show', rune)
  const frame = open_pixmap('frame', rune_viewport_size, rune_viewport_size, true);
  clear_viewport()
  var flattened_rune_list = generateFlattenedRuneList(rune)
  drawWithWebGL(flattened_rune_list, drawRune);
  copy_viewport(gl.canvas, frame);
  return new ShapeDrawn(frame);
}

/**
 * turns a given Rune into an Anaglyph
 * @param {Rune} rune - given Rune
 * @return {Picture}
 * If the result of evaluating a program is an Anaglyph,
 * the REPL displays it graphically, using anaglyph
 * technology, instead of textually. Use your 3D-glasses
 * to view the Anaglyph.
 */
function anaglyph(rune) {
  throwIfNotRune('anaglyph', rune)
  const frame = open_pixmap('frame', rune_viewport_size, rune_viewport_size, true);
  clear_viewport()
  clearAnaglyphFramebuffer()
  var flattened_rune_list = generateFlattenedRuneList(rune)
  drawWithWebGL(flattened_rune_list, drawAnaglyph)
  copy_viewport(gl.canvas, frame);
  return new ShapeDrawn(frame);
}

var hollusionTimeout
/* // to view documentation, put two * in this line
 * // currently, this function is not documented;
 * // animation not working
 * turns a given Rune into Hollusion
 * @param {Rune} rune - given Rune
 * @return {Picture}
 * If the result of evaluating a program is a Hollusion,
 * the REPL displays it graphically, using hollusion
 * technology, instead of textually.
 */
function hollusion(rune, num) {
  clear_viewport()
  var num = num > 5 ? num : 5;
  var flattened_rune_list = generateFlattenedRuneList(rune)
  var frame_list = []
  for (var j = 0; j < num; j++) {
    var frame = open_pixmap('frame' + j, rune_viewport_size, rune_viewport_size, false)
    for (var i = 0; i < flattened_rune_list.length; i++) {
      var rune = flattened_rune_list[i].rune
      var instanceArray = flattened_rune_list[i].instanceArray
      var cameraMatrix = mat4.create()
      mat4.lookAt(
        cameraMatrix,
        vec3.fromValues(-halfEyeDistance + j / (num - 1) * 2 * halfEyeDistance, 0, 0),
        vec3.fromValues(0, 0, -0.4),
        vec3.fromValues(0, 1, 0)
      )
      draw3D(rune.first, rune.count, instanceArray, cameraMatrix, [1, 1, 1, 1], null, true)
    }
    gl.finish()
    copy_viewport(gl.canvas, frame)
    frame_list.push(frame)
    clear_viewport()
  }
  for (var i = frame_list.length - 2; i > 0; i--) {
    frame_list.push(frame_list[i])
  }
  const outframe = open_pixmap('frame', rune_viewport_size, rune_viewport_size, true);
  function animate() {
    var frame = frame_list.shift()
    copy_viewport(frame, outframe);
    frame_list.push(frame)
    hollusionTimeout = setTimeout(animate, 500 / num)
  }
  animate();
  return new ShapeDrawn(outframe);
}

function clearHollusion() {
  clearTimeout(hollusionTimeout)
}

/*-----------------------Transformation functions----------------------*/
/**
 * scales a given Rune by separate factors in x and y direction
 * @param {number} ratio_x - scaling factor in x direction
 * @param {number} ratio_y - scaling factor in y direction
 * @param {Rune} rune - given Rune
 * @return {Rune} resulting scaled Rune
 */
function scale_independent(ratio_x, ratio_y, rune) {
  throwIfNotRune('scale_independent', rune)
  var scaleVec = vec3.fromValues(ratio_x, ratio_y, 1)
  var scaleMat = mat4.create()
  mat4.scale(scaleMat, scaleMat, scaleVec)
  var wrapper = new Rune()
  wrapper.addS(rune)
  wrapper.setM(scaleMat)
  return wrapper
}


/**
 * scales a given Rune by a given factor in both x and y direction
 * @param {number} ratio - scaling factor
 * @param {Rune} rune - given Rune
 * @return {Rune} resulting scaled Rune
 */
function scale(ratio, rune) {
  throwIfNotRune('scale', rune)
  return scale_independent(ratio, ratio, rune)
}



/**
 * translates a given Rune by given values in x and y direction
 * @param {number} x - translation in x direction
 * @param {number} y - translation in y direction
 * @param {Rune} rune - given Rune
 * @return {Rune} resulting translated Rune
 */
function translate(x, y, rune) {
  throwIfNotRune('translate', rune)
  var translateVec = vec3.fromValues(x, -y, 0)
  var translateMat = mat4.create()
  mat4.translate(translateMat, translateMat, translateVec)
  var wrapper = new Rune()
  wrapper.addS(rune)
  wrapper.setM(translateMat)
  return wrapper
}

/**
 * rotates a given Rune by a given angle,
 * given in radians, in anti-clockwise direction.
 * Note that parts of the Rune
 * may be cropped as a result.
 * @param {number} rad - fraction between 0 and 1
 * @param {Rune} rune - given Rune
 * @return {Rune} rotated Rune
 */
function rotate(rad, rune) {
  throwIfNotRune('rotate', rune)
  var rotateMat = mat4.create()
  mat4.rotateZ(rotateMat, rotateMat, rad)
  var wrapper = new Rune()
  wrapper.addS(rune)
  wrapper.setM(rotateMat)
  return wrapper
}

/**
 * makes a new Rune from two given Runes by
 * placing the first on top of the second
 * such that the first one occupies frac
 * portion of the height of the result and
 * the second the rest
 * @param {number} frac - fraction between 0 and 1
 * @param {Rune} rune1 - given Rune
 * @param {Rune} rune2 - given Rune
 * @return {Rune} resulting Rune
 */
function stack_frac(frac, rune1, rune2) {
  throwIfNotRune('stack_frac', rune1, rune2)
  var upper = translate(0, -(1 - frac), scale_independent(1, frac, rune1))
  var lower = translate(0, frac, scale_independent(1, 1 - frac, rune2))
  var combined = new Rune()
  combined.setS([upper, lower])
  return combined
}

/**
 * makes a new Rune from two given Runes by
 * placing the first on top of the second, each
 * occupying equal parts of the height of the
 * result
 * @param {Rune} rune1 - given Rune
 * @param {Rune} rune2 - given Rune
 * @return {Rune} resulting Rune
 */
function stack(rune1, rune2) {
  throwIfNotRune('stack', rune1, rune2)
  return stack_frac(1 / 2, rune1, rune2)
}

/**
 * makes a new Rune from a given Rune
 * by vertically stacking n copies of it
 * @param {number} n - positive integer
 * @param {Rune} rune - given Rune
 * @return {Rune} resulting Rune
 */
function stackn(n, rune) {
  throwIfNotRune('stackn', rune)
  if (n === 1) {
    return rune
  } else {
    return stack_frac(1 / n, rune, stackn(n - 1, rune))
  }
}

/**
 * makes a new Rune from a given Rune
 * by turning it a quarter-turn around the centre in
 * clockwise direction.
 * @param {Rune} rune - given Rune
 * @return {Rune} resulting Rune
 */
function quarter_turn_right(rune) {
  throwIfNotRune('quarter_turn_right', rune)
  return rotate(-Math.PI / 2, rune)
}

/**
 * makes a new Rune from a given Rune
 * by turning it a quarter-turn in
 * anti-clockwise direction.
 * @param {Rune} rune - given Rune
 * @return {Rune} resulting Rune
 */
function quarter_turn_left(rune) {
  throwIfNotRune('quarter_turn_left', rune)
  return rotate(Math.PI / 2, rune)
}

/**
 * makes a new Rune from a given Rune
 * by turning it upside-down
 * @param {Rune} rune - given Rune
 * @return {Rune} resulting Rune
 */
function turn_upside_down(rune) {
  throwIfNotRune('turn_upside_down', rune)
  return rotate(Math.PI, rune)
}

/**
 * makes a new Rune from two given Runes by
 * placing the first on the left of the second
 * such that the first one occupies frac
 * portion of the width of the result and
 * the second the rest
 * @param {number} frac - fraction between 0 and 1
 * @param {Rune} rune1 - given Rune
 * @param {Rune} rune2 - given Rune
 * @return {Rune} resulting Rune
 */
function beside_frac(frac, rune1, rune2) {
  throwIfNotRune('beside_frac', rune1, rune2)
  var left = translate(-(1 - frac), 0, scale_independent(frac, 1, rune1))
  var right = translate(frac, 0, scale_independent(1 - frac, 1, rune2))
  var combined = new Rune()
  combined.setS([left, right])
  return combined
}

/**
 * makes a new Rune from two given Runes by
 * placing the first on the left of the second,
 * both occupying equal portions of the width
 * of the result
 * @param {Rune} rune1 - given Rune
 * @param {Rune} rune2 - given Rune
 * @return {Rune} resulting Rune
 */
function beside(rune1, rune2) {
  throwIfNotRune('beside', rune1, rune2)
  return beside_frac(1 / 2, rune1, rune2)
}

/**
 * makes a new Rune from a given Rune by
 * flipping it around a horizontal axis,
 * turning it upside down
 * @param {Rune} rune - given Rune
 * @return {Rune} resulting Rune
 */
function flip_vert(rune) {
  throwIfNotRune('flip_vert', rune)
  return scale_independent(1, -1, rune)
}

/**
 * makes a new Rune from a given Rune by
 * flipping it around a vertical axis,
 * creating a mirror image
 * @param {Rune} rune - given Rune
 * @return {Rune} resulting Rune
 */
function flip_horiz(rune) {
  throwIfNotRune('flip_horiz', rune)
  return scale_independent(-1, 1, rune)
}

/**
 * makes a new Rune from a given Rune by
 * arranging into a square for copies of the
 * given Rune in different orientations
 * @param {Rune} rune - given Rune
 * @return {Rune} resulting Rune
 */
function make_cross(rune) {
  throwIfNotRune('make_cross', rune)
  return stack(
    beside(quarter_turn_right(rune), rotate(Math.PI, rune)),
    beside(rune, rotate(Math.PI / 2, rune))
  )
}

/**
 * applies a given function n times to an initial value
 * @param {number} n - a non-negative integer
 * @param {function} f - unary function from t to t
 * @param {t} initial - argument
 * @return {t} - result of n times application of
 *               f to rune: f(f(...f(f(rune))...))
 */
function repeat_pattern(n, pattern, initial) {
  if (n === 0) {
    return initial
  } else {
    return pattern(repeat_pattern(n - 1, pattern, initial))
  }
}

/*-----------------------Color functions----------------------*/
function hexToColor(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
    1
  ]
}

/**
 * adds color to rune by specifying
 * the red, green, blue (RGB) value, ranging from 0.0 to 1.0.
 * RGB is additive: if all values are 1, the color is white,
 * and if all values are 0, the color is black.
 * @param {Rune} rune - the rune to add color to
 * @param {number} r - red value (0.0-1.0)
 * @param {number} g - green value (0.0-1.0)
 * @param {number} b - blue value (0.0-1.0)
 * @returns {Rune} the colored Rune
 */
function color(rune, r, g, b) {
  throwIfNotRune('color', rune)
  var wrapper = new Rune()
  wrapper.addS(rune)
  var color = [r, g, b, 1]
  wrapper.setColor(color)
  return wrapper
}

function addColorFromHex(rune, hex) {
  throwIfNotRune('addColorFromHex', rune)
  var wrapper = new Rune()
  wrapper.addS(rune)
  wrapper.setColor(hexToColor(hex))
  return wrapper
}

/**
 * Gives random color to the given rune.
 * The color is chosen randomly from the following nine
 * colors: red, pink, purple, indigo, blue, green, yellow, orange, brown
 * @param {Rune} rune - the rune to color
 * @returns {Rune} the colored Rune
 */
function random_color(rune) {
  throwIfNotRune('random_color', rune)
  var wrapper = new Rune()
  wrapper.addS(rune)
  var randomColor = hexToColor(colorPalette[Math.floor(Math.random() * colorPalette.length)])
  wrapper.setColor(randomColor)
  return wrapper
}

// black and white not included because they are boring colors
// colorPalette is used in generateFlattenedRuneList to generate a random color
var colorPalette = [
  '#F44336',
  '#E91E63',
  '#AA00FF',
  '#3F51B5',
  '#2196F3',
  '#4CAF50',
  '#FFEB3B',
  '#FF9800',
  '#795548'
]

/**
 * colors the given rune red.
 * @param {Rune} rune - the rune to color
 * @returns {Rune} the colored Rune
 */
function red(rune) {
  throwIfNotRune('red', rune)
  return addColorFromHex(rune, '#F44336')
}

/**
 * colors the given rune pink.
 * @param {Rune} rune - the rune to color
 * @returns {Rune} the colored Rune
 */
function pink(rune) {
  throwIfNotRune('pink', rune)
  return addColorFromHex(rune, '#E91E63')
}

/**
 * colors the given rune purple.
 * @param {Rune} rune - the rune to color
 * @returns {Rune} the colored Rune
 */
function purple(rune) {
  throwIfNotRune('purple', rune)
  return addColorFromHex(rune, '#AA00FF')
}

/**
 * colors the given rune indigo.
 * @param {Rune} rune - the rune to color
 * @returns {Rune} the colored Rune
 */
function indigo(rune) {
  throwIfNotRune('indigo', rune)
  return addColorFromHex(rune, '#3F51B5')
}

/**
 * colors the given rune blue.
 * @param {Rune} rune - the rune to color
 * @returns {Rune} the colored Rune
 */
function blue(rune) {
  throwIfNotRune('blue', rune)
  return addColorFromHex(rune, '#2196F3')
}

/**
 * colors the given rune green.
 * @param {Rune} rune - the rune to color
 * @returns {Rune} the colored Rune
 */
function green(rune) {
  throwIfNotRune('green', rune)
  return addColorFromHex(rune, '#4CAF50')
}

/**
 * colors the given rune yellow.
 * @param {Rune} rune - the rune to color
 * @returns {Rune} the colored Rune
 */
function yellow(rune) {
  throwIfNotRune('yellow', rune)
  return addColorFromHex(rune, '#FFEB3B')
}

/**
 * colors the given rune orange.
 * @param {Rune} rune - the rune to color
 * @returns {Rune} the colored Rune
 */
function orange(rune) {
  throwIfNotRune('orange', rune)
  return addColorFromHex(rune, '#FF9800')
}

/**
 * colors the given rune brown.
 * @param {Rune} rune - the rune to color
 * @returns {Rune} the colored Rune
 */
function brown(rune) {
  throwIfNotRune('brown', rune)
  return addColorFromHex(rune, '#795548')
}

/**
 * colors the given rune black.
 * @param {Rune} rune - the rune to color
 * @returns {Rune} the colored Rune
 */
function black(rune) {
  throwIfNotRune('black', rune)
  return addColorFromHex(rune, '#000000')
}

/**
 * colors the given rune white.
 * @param {Rune} rune - the rune to color
 * @returns {Rune} the colored Rune
 */
function white(rune) {
  throwIfNotRune('white', rune)
  return addColorFromHex(rune, '#FFFFFF')
}

/**
 * makes a 3D-Rune from two given Runes by
 * overlaying the first with the second
 * such that the first one occupies frac
 * portion of the depth of the 3D result
 * and the second the rest
 * @param {number} frac - fraction between 0 and 1
 * @param {Rune} rune1 - given Rune
 * @param {Rune} rune2 - given Rune
 * @return {Rune} resulting Rune
 */
function overlay_frac(frac, rune1, rune2) {
  throwIfNotRune('overlay_frac', rune1, rune2)
  var front = new Rune()
  front.addS(rune1)
  var frontMat = front.getM()
  // z: scale by frac
  mat4.scale(frontMat, frontMat, vec3.fromValues(1, 1, frac))

  var back = new Rune()
  back.addS(rune2)
  var backMat = back.getM()
  // z: scale by (1-frac), translate by -frac
  mat4.scale(
    backMat,
    mat4.translate(backMat, backMat, vec3.fromValues(0, 0, -frac)),
    vec3.fromValues(1, 1, 1 - frac)
  )

  var combined = new Rune()
  combined.setS([front, back]) // render front first to avoid redrawing
  return combined
}

/**
 * makes a 3D-Rune from two given Runes by
 * overlaying the first with the second, each
 * occupying equal parts of the depth of the
 * result
 * @param {Rune} rune1 - given Rune
 * @param {Rune} rune2 - given Rune
 * @return {Rune} resulting Rune
 */
function overlay(rune1, rune2) {
  throwIfNotRune('overlay', rune1, rune2)
  return overlay_frac(0.5, rune1, rune2)
}

/*
function stereogram(rune) {
  clear_viewport()
  var flattened_rune_list = generateFlattenedRuneList(rune)
  var depth_map = open_pixmap('depth_map', rune_viewport_size, rune_viewport_size, true)
  // draw the depth map
  for (var i = 0; i < flattened_rune_list.length; i++) {
    var rune = flattened_rune_list[i].rune
    var instanceArray = flattened_rune_list[i].instanceArray
    drawRune(rune.first, rune.count, instanceArray)
  }
  gl.finish()
  copy_viewport(gl.canvas, depth_map)

  // copy from the old library, with some modifications
  var E = 100 //; distance between eyes, 300 pixels
  var D = 600 //distance between eyes and image plane, 600 pixels
  var delta = 40 //stereo seperation
  var MAX_X = depth_map.width
  var MAX_Y = depth_map.height
  var MAX_Z = 0
  var CENTRE = Math.round(MAX_X / 2)

  var stereo_data = depth_map.getContext('2d').createImageData(depth_map.width, depth_map.height)
  var pixels = stereo_data.data
  var depth_data = depth_map.getContext('2d').getImageData(0, 0, depth_map.width, depth_map.height)
  var depth_pix = depth_data.data
  function get_depth(x, y) {
    if (x >= 0 && x < MAX_X) {
      var tgt = 4 * (y * depth_map.width + x)
      return -100 * depth_pix[tgt] / 255 - 400
    } else return -500
  }
  for (var y = 0; y < MAX_Y; y++) {
    //may want to use list of points instead
    var link_left = []
    var link_right = []
    var colours = []
    //varraint creation
    for (var x = 0; x < MAX_X; x++) {
      var z = get_depth(x, y)
      var s = delta + z * (E / (z - D)) // Determine distance between intersection of lines of sight on image plane
      var left = x - Math.round(s / 2) //x is integer, left is integer
      var right = left + Math.round(s) //right is integer
      if (left > 0 && right < MAX_X) {
        if (
          (!link_right[left] || s < link_right[left]) &&
          (!link_left[right] || s < link_left[right])
        ) {
          link_right[left] = Math.round(s)
          link_left[right] = Math.round(s)
        }
      }
    }
    //varraint resolution
    for (var x = 0; x < MAX_X; x++) {
      var s = link_left[x]
      if (s == undefined) s = Infinity
      else s = x
      var d
      if (x - s > 0) d = link_right[x - s]
      else d = Infinity
      if (s == Infinity || s > d) link_left[x] = 0
    }
    //drawing step
    for (var x = 0; x < MAX_X; x++) {
      var s = link_left[x] //should be valid for any integer till MAX_X
      var colour = colours[x - s] || [
        Math.round(Math.round(Math.random() * 10 / 9) * 255),
        Math.round(Math.round(Math.random() * 10 / 9) * 255),
        Math.round(Math.round(Math.random() * 10 / 9) * 255)
      ]
      var tgt = 4 * (y * depth_map.width + x)
      pixels[tgt] = colour[0]
      pixels[tgt + 1] = colour[1]
      pixels[tgt + 2] = colour[2]
      pixels[tgt + 3] = 255
      colours[x] = colour
    }
  }
  //throw on canvas
  depth_map.getContext('2d').putImageData(stereo_data, 0, 0)
  copy_viewport_webGL(depth_map)
  return new ShapeDrawn()
}
*/

/**
 * compares two Pictures and returns the mean squared error of the pixel intensities.
 * @param {Picture} picture1
 * @param {Picture} picture2
 * @return {number} mse
 * example: picture_mse(show(heart), show(nova));
 */
function picture_mse(picture1, picture2) {
  var width = picture1.$canvas.width
  var height = picture1.$canvas.height
  var data1 = picture1.$canvas.getContext('2d').getImageData(0, 0, width, height).data
  var data2 = picture2.$canvas.getContext('2d').getImageData(0, 0, width, height).data
  var sq_err = 0
  for (var i = 0; i < data1.length; i++) {
    var err = (data1[i] - data2[i]) / 255
    sq_err += err * err
  }
  return sq_err / data1.length
}

exports.getReadyWebGLForCanvas = getReadyWebGLForCanvas
exports.show = show;
exports.color = color;
exports.random_color = random_color;
exports.red = red;
exports.pink = pink;
exports.purple = purple;
exports.indigo = indigo;
exports.blue = blue;
exports.green = green;
exports.yellow = yellow;
exports.orange = orange;
exports.brown = brown;
exports.black = black;
exports.white = white;
exports.scale_independent = scale_independent;
exports.scale = scale;
exports.translate = translate;
exports.rotate = rotate;
exports.stack_frac = stack_frac;
exports.stack = stack;
exports.stackn = stackn;
exports.quarter_turn_right = quarter_turn_right;
exports.quarter_turn_left = quarter_turn_left;
exports.turn_upside_down = turn_upside_down;
exports.beside_frac = beside_frac;
exports.beside = beside;
exports.flip_vert = flip_vert;
exports.flip_horiz = flip_horiz;
exports.make_cross = make_cross;
exports.repeat_pattern = repeat_pattern;
exports.square = square;
exports.blank = blank;
exports.rcross = rcross;
exports.sail = sail;
exports.corner = corner;
exports.nova = nova;
exports.circle = circle;
exports.heart = heart;
exports.pentagram = pentagram;
exports.ribbon = ribbon;
exports.anaglyph = anaglyph;
exports.overlay_frac = overlay_frac;
exports.overlay = overlay;
exports.hollusion = hollusion;
exports.picture_mse = picture_mse;
