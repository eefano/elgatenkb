const rects = []

const fs = require("fs");
const js = JSON.parse(fs.readFileSync("elgato.json", "utf8"))
const poses = [0,0,0]

function findRect(frame) {
  for (let i = 0; i < rects.length; i++) {
    if (rects[i][0] == frame.x && rects[i][1] == frame.y && rects[i][2] == frame.w && rects[i][3] == frame.h) {
      return i;
    }
  }
  return -1;
}
function dumbframe(frame) {
  return frame.x == 0 && frame.y == 0 && frame.w == 1 && frame.h == 1;
}

for (const [key, value] of Object.entries(js.frames)) {
  //console.log(`${key}: ${value}`);
  //if (key.startsWith('A'))
  {
    i = findRect(value.frame);
    if (i < 0)
    {    
      i = rects.length;
      rects.push([value.frame.x, value.frame.y, value.frame.w, value.frame.h])
    }

    //if (!dumbframe(value.spriteSourceSize))
      poses.push(value.spriteSourceSize.x, value.spriteSourceSize.y, i)

  }
}

console.log('let rects =', rects)
console.log('let poses =', poses)
console.log('let imagew =', js.meta.size.w)
console.log('let imageh =', js.meta.size.h)
console.log('let imagedata = "' + fs.readFileSync("elgato_crushed.png").toString("base64") + '"')
