let weendow = window, BASEX = 50, BASEY = 75

let WHITE = [1, 1, 1]
let OUTLINE = [.1, .1, .1]

let gl, uniforms = {}

let xres, yres, canvas, canvasstyle, keystate = [], keytrigs = []
let frame = 0, points = 0, win = false, cat, walkline = 220

let audioCtx = new weendow.AudioContext();
let vpitch = []
let vgain = []
let vfilter = []

let VL = {
  bkg: newset(), // background
  mob: newset(), // enemies
  enf: newset(), // enemy fire
  cat: newset(), // player
  frf: newset(), // player fire
  hud: newset(), // foreground
}
let CL = {
  mob: newset(),
  cat: newset(),
  frf: newset(),
}
let Cmp = {
  movers: newset(),
  removers: newset(),
  speeders: newset(),
  deferrers: newset(),
  clippers: newset(),
  flickerers: newset(),
  animators: newset(),
}

function newset() { return new Set(); }

function glUniform2f(what, one, two) {
  gl.uniform2f(uniforms[what], one, two)
}
function glBindTexture(t) {
  gl.bindTexture(3553 /*gl.TEXTURE_2D*/, t)
}

function initWebgl() {
  gl = canvas.getContext("webgl")
  gl.enable(3042 /*gl.BLEND*/)
  gl.blendFunc(770 /*gl.SRC_ALPHA*/, 771 /*gl.ONE_MINUS_SRC_ALPHA*/)

  let program = gl.createProgram()

  function shady(type, body) {
    let vshader = gl.createShader(type)
    gl.attachShader(program, vshader)
    gl.shaderSource(vshader, body)
    gl.compileShader(vshader)
  }

  shady(35633 /*gl.VERTEX_SHADER*/, `attribute vec2 aP;uniform vec2 uO,uS,uR;varying highp vec2 vT;void main(){gl_Position=vec4((aP.x*uS.x+uO.x)*2.0/uR.x-1.0,1.0-(aP.y*uS.y+uO.y)*2.0/uR.y,0.0,1.0);vT=aP;}`)
  shady(35632 /*gl.FRAGMENT_SHADER*/, `varying highp vec2 vT;uniform sampler2D uM;uniform lowp vec4 uC;uniform highp vec2 uX,uW;void main(){gl_FragColor=texture2D(uM,vT*uW+uX)*uC;}`)

  gl.linkProgram(program)
  gl.useProgram(program)

  for (let what of ["uO", "uC", "uS", "uW", "uX", "uR"])
    uniforms[what] = gl.getUniformLocation(program, what)

  let vertexArray = new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0])

  let vertexBuffer = gl.createBuffer()
  gl.bindBuffer(34962 /*gl.ARRAY_BUFFER*/, vertexBuffer)
  gl.bufferData(34962 /*gl.ARRAY_BUFFER*/, vertexArray, 35044 /*gl.STATIC_DRAW*/)


  glUniform2f("uR", canvas.width, canvas.height)

  let aP = gl.getAttribLocation(program, "aP")
  gl.enableVertexAttribArray(aP)
  gl.vertexAttribPointer(aP, 2, 5126 /*gl.FLOAT*/, false, 0, 0)
}

function drawSubTexture(r, dx, dy, k = 1) {
  glUniform2f("uO", dx, dy)
  glUniform2f("uS", r[2] * k, r[3] * k)
  glUniform2f("uW", r[2] / imagew, r[3] / imageh)
  glUniform2f("uX", r[0] / imagew, r[1] / imageh)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

function glTexParameteri(par, val) {
  gl.texParameteri(3553 /*gl.TEXTURE_2D*/, par, val)
}

function tintTexture(col) {
  gl.uniform4f(uniforms["uC"], col[0], col[1], col[2], 1)
}

function loadTexture(image) {
  let id = gl.createTexture()
  glBindTexture(id)
  gl.texImage2D(3553 /*gl.TEXTURE_2D*/, 0, 6408 /*gl.RGBA*/, 6408 /*gl.RGBA*/, 5121 /*gl.UNSIGNED_BYTE*/, image)
  glTexParameteri(10241 /*gl.TEXTURE_MIN_FILTER*/, 9728 /*gl.NEAREST*/)
  glTexParameteri(10240 /*gl.TEXTURE_MAG_FILTER*/, 9728 /*gl.NEAREST*/)
  glTexParameteri(10242 /*gl.TEXTURE_WRAP_S*/, 33071 /*gl.CLAMP_TO_EDGE*/)
  glTexParameteri(10243 /*gl.TEXTURE_WRAP_T*/, 33071 /*gl.CLAMP_TO_EDGE*/)
  tintTexture(WHITE)
}

function Entity(o = {}) {
  o.sets = newset()

  o.inSet = (set) => {
    set.add(o)
    o.sets.add(set)
    return o
  }

  o.hasPos = (posx, posy) => {
    o.posx = posx
    o.posy = posy
    return o
  }

  o.hasVel = (velx, vely) => {
    o.velx = velx
    o.vely = vely
    return o.inSet(Cmp.speeders)
  }

  o.hasSprite = (layer, pawse, zoom = 1, bx = BASEX, by = BASEY) => {
    o.vis = true
    o.drawfunc = () => {
        drawSubTexture(rects[poses[o.pawse * 3 + 2]],
        o.posx + poses[o.pawse * 3] - bx,
        o.posy + poses[o.pawse * 3 + 1] - by, zoom
      )
    }
    o.pawse = pawse
    return o.inSet(layer)
  }

  o.hasText = (layer, textfunc, fore) => {
    o.vis = true
    o.drawfunc = () => outlinetext(textfunc(), o.posx, o.posy, fore, OUTLINE)
    return o.inSet(layer)
  }

  o.hasCollision = (mylayer, f) => {
    o.collision = f
    o.cancollide = true
    return o.inSet(mylayer)
  }

  o.hasBoundary = (marginx, marginy) => {
    o.marginx = marginx
    o.marginy = marginy
    return o.inSet(Cmp.clippers)
  }

  o.hasAnimation = (animf) => {
    o.animfunc = animf
    return o.inSet(Cmp.animators)
  }

  o.hasMovement = (movef) => {
    o.movefunc = movef
    return o.inSet(Cmp.movers)
  }

  o.hasInvuln = (timeout, endfunc) => {
    o.invulnerable = true
    o.invuln = timeout
    o.invulnfunc = endfunc
    return o.inSet(Cmp.flickerers)
  }

  o.deferrer = (f) => Cmp.deferrers.add(f)
  o.remover = () => Cmp.removers.add(o)

  return o
}


function normaltext(text, xo, yo) {
  let x = xo, y = yo - 5, r = rects[poses[19 * 3 + 2]]
  for (let i = 0; i < text.length; i++) {
    c = text.charCodeAt(i) - 32;
    drawSubTexture([r[0] + (c & 7) * 5, r[1] + (c >> 3) * 5, 5, 5], x, y)
    x += 6
  }
}

function outlinetext(text, x, y, fore, back) {
  tintTexture(back)
  let offs = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]]
  for (let i of offs) normaltext(text, x + i[0], y + i[1])
  tintTexture(fore)
  normaltext(text, x + 1, y + 1)
  tintTexture(WHITE)
}

function Bell(posx, posy, targetx, targety) {

  //play('ring.mp3')
  svatnow(vgain[3], .2)
  svatnow(vgain[3], 0, .3)


  let dx = targetx - posx
  let dy = targety - posy
  let l = Math.sqrt(dx * dx + dy * dy)
  if (l == 0) return
  dx /= l
  dy /= l

  let o = Entity()
    .hasPos(posx, posy)
    .hasVel(dx * 4, dy * 4)
    .hasSprite(VL.enf, 17)
    .hasCollision(CL.mob, () => o.remover())
    .hasBoundary(10, 10)

  return o
}

function svatnow(what, v, t = 0) {
  what.setValueAtTime(v, audioCtx.currentTime + t)
}
function svatlin(what, v0, v1, t, t0 = 0) {
  svatnow(what, v0, t0)
  what.linearRampToValueAtTime(v1, audioCtx.currentTime + t + t0);
}

function Lazur(posx, posy, dx, dy) {

  // play('shot.mp3')
  svatlin(vpitch[0], 2000, 0, .1)
  svatlin(vgain[0], .2, 0, .1)

  let pawse = 6 + (dx + 1) + (dy + 1) * 3
  if (pawse == 10) dx = 1
  let o = Entity()
    .hasPos(posx, posy)
    .hasVel(dx * 8, dy * 8)
    .hasSprite(VL.frf, pawse)
    .hasCollision(CL.frf, () => o.remover())
    .hasBoundary(10, 10)

  return o
}

function Cat(xp, yp, diefunc) {
  let jumpbig = [],
    jumpsmall = []
  for (let i = -20; i < 20; i++) {
    jumpbig.push(60 + (i * i * (yp - 60)) / (20 * 20))
    jumpsmall.push(120 + (i * i * (yp - 120)) / (20 * 20))
  }
  let o = Entity({
    lives: 9,
    jumping: false,
    crouching: false,
    dead: false,
    jumpstart: 0,
    diefunc: diefunc,
  })
    .hasPos(xp, yp)
    .hasSprite(VL.cat, 2)
    .hasAnimation((frame) => {
      if (o.dead) o.pawse = 5
      else {
        if (o.jumping) o.pawse = 1
        else if (o.crouching) o.pawse = 4
        else {
          if ((frame >> 3) & 1) o.pawse = 2
          else o.pawse = 3
        }
      }
    })
    .hasMovement((frame) => {
      if (keytrigs[32] && !o.dead) {
        let dx = 0
        if (keystate[37]) dx = dx - 1
        if (keystate[39]) dx = dx + 1
        let dy = 0
        if (keystate[38]) dy = dy - 1
        if (keystate[40]) dy = dy + 1

        let fire = (o.pawse + 20) * 3
        let px = o.posx + poses[fire] - BASEX
        let py = o.posy + poses[fire + 1] - BASEY

        o.deferrer(() => Lazur(px, py, dx, dy))
      }

      if (keytrigs[38] && !o.jumping && !o.dead) {
        o.jumping = true
        o.jumpcycle = o.crouching ? jumpbig : jumpsmall
        o.crouching = false
        o.jumpstart = frame
      }

      if (o.jumping) {
        let d = frame - o.jumpstart
        if (d < 40) o.posy = o.jumpcycle[d]
        else o.jumping = false
      } else {
        o.posy = yp
        if (o.dead) o.crouching = true
        else o.crouching = keystate[40]
      }

      if (!o.crouching && !o.dead) {
        if (keystate[37]) o.posx -= 2
        if (keystate[39]) o.posx += 2
      } else if (!win) o.posx -= 1

      if (o.posx < 20 && !o.dead) {
        o.crouching = false
        o.posx = 20
      }
      if (o.posx < -100 && o.dead) {
        o.remover()
      }

      if (o.posx > 300) o.posx = 300
    })
    .hasCollision(CL.cat, () => {
      if (!o.invulnerable && !o.dead) {
        o.cancollide = false

        o.lives = o.lives - 1
        if (o.lives == 0) {
          o.dead = true
          o.pawse = 5
          o.diefunc(o)
        } else {

          //play('hit.mp3')
          svatlin(vpitch[2], 400 + rand(50), 300, .4)
          svatlin(vfilter[2], 2000, 100, .3)
          svatnow(vgain[2], .3)
          svatnow(vgain[2], 0, .5)

          o.hasInvuln(60, () => { o.cancollide = true })
        }
      }
    })

  return o
}

function Clock(shootChance, steerChance, pointfunc) {
  let o = Entity({ shootChance: shootChance, steerChance: steerChance, pointfunc: pointfunc })
    .hasPos(340, rand(160) + 40)
    .hasVel(-1, 0)
    .hasSprite(VL.mob, 15)
    .hasAnimation((frame) => {
      o.pawse = 15 + ((frame / 20) & 1)
    })
    .hasBoundary(30, 30)
    .hasMovement(() => {
      if (dice(o.shootChance) && VL.cat.size > 0) {
        let cat = VL.cat.values().next().value
        o.deferrer(() => Bell(o.posx, o.posy, cat.posx, cat.posy))
      }
      if (dice(o.steerChance)) {
        o.velx = rand(3) - 1
        o.vely = rand(5) - 2
      }
    })
    .hasCollision(CL.mob, () => {
      if (!o.invulnerable) {

        //play('boom.mp3')
        svatlin(vgain[1], .2, 0, .5)

        o.pointfunc(o)
        o.cancollide = false
        o.hasMovement(() => { }).hasInvuln(30, () => o.remover())
      }
    })

  return o
}

function rand(n) {
  return (Math.random() * n) | 0
}

function dice(p1000) {
  if (p1000 == 0) return false
  return rand(1000) <= p1000
}

function Background(xstart) {
  let o = Entity()
    .hasPos(xstart, 0)
    .hasSprite(VL.bkg, 20, 2, 0, 0)
    .hasMovement(() => {
      o.posx--
      if (o.posx <= -xres) o.posx = xres
    })
  return o
}

function Text(x, y, textfunc, fore) {
  return Entity().hasPos(x, y).hasText(VL.hud, textfunc, fore)
}

function meh(o) {
  let re = rects[poses[o.pawse * 3 + 2]]
  let ax = o.posx + poses[o.pawse * 3] - BASEX
  let ay = o.posy + poses[o.pawse * 3 + 1] - BASEY
  return [ax, ay, ax + re[2], ay + re[3]]
}

function collisions(oo1, oo2) {

  for (let o1 of oo1) {
    if (!o1.cancollide) continue
    let m1 = meh(o1)

    for (let o2 of oo2) {
      if (!o2.cancollide) continue
      let m2 = meh(o2)

      //if ((a2x - b1x) * (b2x - a1x) < 0.0 && (a2y - b1y) * (b2y - a1y) < 0.0) {
      if ((m2[0] - m1[2]) * (m2[2] - m1[0]) < 0.0 && (m2[1] - m1[3]) * (m2[3] - m1[1]) < 0.0) {
        o1.collision(o2)
        o2.collision(o1)
      }
    }
  }
}

function reqframe() { weendow.requestAnimationFrame(step) }

function step() {

  svatnow(vpitch[1], rand(1000) + 200)
  if (frame & 1) svatlin(vfilter[3], 250, 600, .03)

  for (let o of Cmp.animators) {
    o.animfunc(frame)
  }

  // RENDERING

  Object.entries(VL).forEach(([name, layer]) => {
    for (let o of layer) {
      if (o.vis) o.drawfunc()
    }
  })

  // COLLISIONS

  collisions(CL.cat, CL.mob)
  collisions(CL.frf, CL.mob)

  for (let o of Cmp.flickerers) {
    o.vis = (frame | 0) & 1
    o.invuln--

    if (o.invuln <= 0) {
      o.invulnerable = false
      o.vis = true
      o.invulnfunc()
    }
  }

  for (let o of Cmp.movers) {
    o.movefunc(frame)
  }
  for (let o of Cmp.speeders) {
    o.posx += o.velx
    o.posy += o.vely
  }
  for (let o of Cmp.clippers) {
    if (
      o.posx < -o.marginx ||
      o.posy < -o.marginy ||
      o.posx > xres + o.marginx ||
      o.posy > yres + o.marginy
    )
      o.remover()
  }

  // DIFFICULTY INCREASING

  function spawnclocks(howMany, shootChance, steerChance) {
    for (let i = 0; i < howMany - VL.mob.size; i++) {
      Clock(shootChance, steerChance, () => {
        points += 10
      })
    }
  }

  if (!win) {
    if (points >= 500) {
      win = true
      VL.bkg.forEach((o) => o.hasMovement(() => { }))
      VL.mob.forEach((o) => o.remover())
      VL.enf.forEach((o) => o.remover())
      Text(120, 110, () => "WINNER!", WHITE)
      Entity()
        .hasPos(160, walkline)
        .hasSprite(VL.mob, 18)

      //play("win.mp3", true)
      for (let i = 0, k = 0; i < 16; i++, k += .2) {
        svatnow(vpitch[2], (200 + (i >> 2) * 30) * ((i & 3) * .5 + 1), k)
        svatlin(vfilter[2], 2000, 300, .5 * k, k)
        svatlin(vgain[2], .3, 0, k * 2, k)
      }

    } else if (points >= 400) spawnclocks(7, 10, 10)
    else if (points >= 300) spawnclocks(6, 5, 5)
    else if (points >= 200) spawnclocks(5, 5, 3.3)
    else if (points >= 150) spawnclocks(4, 2.5, 2.5)
    else if (points >= 100) spawnclocks(3, 2.5, 2)
    else if (points >= 50) spawnclocks(2, 0, 1.6)
    else spawnclocks(1, 0, 0)
  }

  for (let o of Cmp.removers) {
    for (let s of o.sets) s.delete(o)
  }
  Cmp.removers.clear()
  keytrigs = []

  for (let o of Cmp.deferrers) {
    o()
  }
  Cmp.deferrers.clear()

  frame++
  reqframe();
}

function init() {
  //play("ingame.mp3", true)
  Background(0)
  Background(xres)
  Text(1, 6, () => "CURSORS+SPACE.CROUCH 4 HI-JUMPS", [0, 1, 1])
  Text(10, yres - 5, () => "# " + cat.lives, [1, .5, .5])
  Text(240, yres - 5, () => "$ " + points, [1, 1, 0])

  cat = Cat(40, walkline, () => {
    Text(120, 110, () => "GAME OVER", WHITE)
    //play("die.mp3", true)
    svatlin(vpitch[2], 500, 250, 1)
    svatlin(vfilter[2], 2000, 200, 1)
    svatnow(vgain[2], .3)
    svatnow(vgain[2], 0, 1.5)
  })
}

function keydown(e) {
  if (!keystate[e.keyCode]) {
    keystate[e.keyCode] = true
    keytrigs[e.keyCode] = true
  }
}
function keyup(e) {
  keystate[e.keyCode] = false
}


function listener(e, f) {
  weendow.addEventListener(e, f)
}
function resize() {

  let r = weendow.devicePixelRatio
  let h = weendow.innerHeight * r
  let w = weendow.innerWidth * r

  let kx = (w / xres) | 0
  let ky = (h / yres) | 0
  let k = 1

  if (kx < ky) {
    if (kx > 1) k = kx
    else k = 1
  } else {
    if (ky > 1) k = ky
    else k = 1
  }

  canvasstyle.width = (xres * k) / r + "px"
  canvasstyle.height = (yres * k) / r + "px"
}

listener("load", async () => {

  canvas = document.getElementById("gc")
  xres = canvas.width
  yres = canvas.height
  canvasstyle = canvas.style

  listener("resize", resize)
  resize()
  initWebgl()

  let image = new Image()
  image.src = 'data:image/png;base64,' + imagedata
  await image.decode()
  loadTexture(image)

  for (let v = 0; v < 4; v++) {
    let oscNode = audioCtx.createOscillator();
    let filterNode = audioCtx.createBiquadFilter();
    let gainNode = audioCtx.createGain();

    oscNode.connect(filterNode);
    filterNode.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    if (v == 2) oscNode.type = 'sawtooth'
    oscNode.start()

    vpitch[v] = oscNode.frequency
    vfilter[v] = filterNode.frequency
    vgain[v] = gainNode.gain

    svatnow(vgain[v], 0)
    svatnow(vfilter[v], 20000)
  }


  listener("keydown", keydown)
  listener("keyup", keyup)

  init()
  reqframe();
})
