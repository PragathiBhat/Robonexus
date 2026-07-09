// Shared masterplan point-cloud geometry, used by both index.html (forming intro)
// and particle-site-map.html (final explorable view). Edit the layout here once
// and both pages stay in sync.
window.SiteBuilder = (function(){
  "use strict";

  var W = 1500, H = 1050;         // plan-view design space (px)
  var SCALE = 0.018;              // plan px -> world units
  var CX = W/2, CZ = H/2;         // plan-space center
  var MAX_PLAN_RADIUS = Math.hypot(W/2, H/2);

  var KIND_COLOR = {
    building: [0.92, 0.97, 1.00],
    road:     [0.43, 0.91, 1.00],
    tree:     [0.35, 0.67, 1.00],
    plaza:    [0.78, 0.90, 1.00],
    garden:   [0.51, 0.78, 1.00],
  };

  function polyBounds(poly){
    var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(var i=0;i<poly.length;i++){
      var x=poly[i][0], y=poly[i][1];
      if(x<minX)minX=x; if(x>maxX)maxX=x;
      if(y<minY)minY=y; if(y>maxY)maxY=y;
    }
    return {minX:minX,minY:minY,maxX:maxX,maxY:maxY};
  }
  function pointInPolygon(x, y, poly){
    var inside = false;
    for(var i=0, j=poly.length-1; i<poly.length; j=i++){
      var xi=poly[i][0], yi=poly[i][1], xj=poly[j][0], yj=poly[j][1];
      var intersect = ((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi);
      if(intersect) inside = !inside;
    }
    return inside;
  }

  function buildingHeightFor(area){
    // taller, more assertive volumes so buildings read as extruded 3D masses, not flat plaques
    var h = 1.3 + Math.min(3.4, area/5200);
    return h;
  }

  // SETTLE_DUR range is only meaningful to the forming animation, but we keep it
  // on every particle so index.html's timeline logic can use it unmodified.
  var SETTLE_DUR_MIN = 0.9, SETTLE_DUR_MAX = 1.7;

  function buildSite(){
    var particles = []; // {tx,ty,tz, sx,sy,sz, size, color[3], triggerPlanR, delayJitter, settleDur, phase, twinkleSpeed}

    function addParticle(wx, wy, wz, kind, size){
      var planR = Math.hypot(wx, wz) / SCALE;
      var col = KIND_COLOR[kind] || KIND_COLOR.building;
      var variance = 0.9 + Math.random()*0.2;

      var ang = Math.random()*Math.PI*2;
      var rad = 1.2 + Math.random()*4.5;
      var sx = wx + Math.cos(ang)*rad;
      var sz = wz + Math.sin(ang)*rad;
      var sy = wy + 1.0 + Math.random()*3.2;

      particles.push({
        tx:wx, ty:wy, tz:wz,
        sx:sx, sy:sy, sz:sz,
        size: size * variance,
        color: [col[0]*variance, col[1]*variance, col[2]*variance],
        triggerPlanR: planR,
        delayJitter: (Math.random()-0.5)*0.5,
        settleDur: SETTLE_DUR_MIN + Math.random()*(SETTLE_DUR_MAX-SETTLE_DUR_MIN),
        phase: Math.random()*Math.PI*2,
        twinkleSpeed: 0.5 + Math.random()*1.1
      });
    }

    function pushBuildingPoint(interiorX, interiorZ, perimeterFn, height){
      var r = Math.random();
      var px, pz, wy;
      if(r < 0.5){
        // roof plane — dominant, crisp, fills the whole footprint
        px = interiorX; pz = interiorZ;
        wy = height * (0.9 + Math.random()*0.1);
      } else if(r < 0.9){
        // vertical wall skin — hugs the footprint's perimeter so the building
        // reads as an extruded box/prism instead of a flat filled column
        var pp = perimeterFn();
        px = pp[0]; pz = pp[1];
        wy = height * Math.random();
      } else {
        // ground contact fringe
        px = interiorX; pz = interiorZ;
        wy = Math.random()*0.05;
      }
      var wx = (px - CX) * SCALE;
      var wz = (pz - CZ) * SCALE;
      addParticle(wx, wy, wz, 'building', 0.05 + Math.random()*0.03);
    }

    function rectPerimeterPoint(x,y,w,h){
      var per = 2*(w+h);
      var t = Math.random()*per;
      if(t<w) return [x+t, y];
      t-=w; if(t<h) return [x+w, y+t];
      t-=h; if(t<w) return [x+w-t, y+h];
      t-=w; return [x, y+h-t];
    }

    function polyPerimeterPoint(poly){
      var n = poly.length;
      var segLen=[], total=0;
      for(var i=0;i<n;i++){
        var j=(i+1)%n;
        var dx=poly[j][0]-poly[i][0], dy=poly[j][1]-poly[i][1];
        var len=Math.hypot(dx,dy); segLen.push(len); total+=len;
      }
      var t=Math.random()*total, idx=0;
      while(idx<segLen.length-1 && t>segLen[idx]){ t-=segLen[idx]; idx++; }
      var p0=poly[idx], p1=poly[(idx+1)%n];
      var f = segLen[idx]===0 ? 0 : t/segLen[idx];
      return [p0[0]+(p1[0]-p0[0])*f, p0[1]+(p1[1]-p0[1])*f];
    }

    function pushGroundPoint(px, pz, kind, size){
      var wx = (px - CX) * SCALE;
      var wz = (pz - CZ) * SCALE;
      var wy = Math.random()*0.06;
      addParticle(wx, wy, wz, kind, size);
    }

    var DENSITY = 3; // multiplies every sample count below for a fully-covered, solid-looking cloud

    function sampleRectBuilding(x,y,w,h,count){
      count = Math.round(count * DENSITY);
      var height = buildingHeightFor(w*h);
      for(var n=0;n<count;n++){
        pushBuildingPoint(x+Math.random()*w, y+Math.random()*h, function(){ return rectPerimeterPoint(x,y,w,h); }, height);
      }
    }
    function samplePolyBuilding(poly, count){
      count = Math.round(count * DENSITY);
      var b = polyBounds(poly);
      var height = buildingHeightFor((b.maxX-b.minX)*(b.maxY-b.minY)*0.55);
      var got=0, attempts=0;
      while(got<count && attempts<count*40){
        attempts++;
        var x = b.minX + Math.random()*(b.maxX-b.minX);
        var y = b.minY + Math.random()*(b.maxY-b.minY);
        if(pointInPolygon(x,y,poly)){ pushBuildingPoint(x,y, function(){ return polyPerimeterPoint(poly); }, height); got++; }
      }
    }
    function sampleRectGround(x,y,w,h,count,kind,size){
      count = Math.round(count * DENSITY);
      for(var n=0;n<count;n++){
        pushGroundPoint(x+Math.random()*w, y+Math.random()*h, kind, size);
      }
    }
    function sampleLineGround(pts, count, jitter, kind, size){
      count = Math.round(count * DENSITY);
      var segLen=[], total=0;
      for(var i=0;i<pts.length-1;i++){
        var dx=pts[i+1][0]-pts[i][0], dy=pts[i+1][1]-pts[i][1];
        var len=Math.hypot(dx,dy); segLen.push(len); total+=len;
      }
      for(var n=0;n<count;n++){
        var t=Math.random()*total, idx=0;
        while(idx<segLen.length-1 && t>segLen[idx]){ t-=segLen[idx]; idx++; }
        var p0=pts[idx], p1=pts[idx+1];
        var f = segLen[idx]===0 ? 0 : t/segLen[idx];
        var x = p0[0]+(p1[0]-p0[0])*f + (Math.random()-0.5)*jitter;
        var y = p0[1]+(p1[1]-p0[1])*f + (Math.random()-0.5)*jitter;
        pushGroundPoint(x,y,kind,size);
      }
    }
    function sampleCircleClusterGround(cx,cy,r,count,kind,size){
      count = Math.round(count * DENSITY);
      for(var n=0;n<count;n++){
        var a=Math.random()*Math.PI*2, rad=Math.random()*r;
        pushGroundPoint(cx+Math.cos(a)*rad, cy+Math.sin(a)*rad, kind, size);
      }
    }
    function sampleTreeCanopy(cx, cy, canopyR, count){
      count = Math.round(count * DENSITY);
      var wx = (cx - CX) * SCALE;
      var wz = (cy - CZ) * SCALE;
      var trunk = 0.35 + Math.random()*0.15;
      var rWorld = canopyR * SCALE * 1.4;
      for(var n=0;n<count;n++){
        var u = Math.random(), v = Math.random(), w = Math.random();
        var theta = u*Math.PI*2, phi = Math.acos(2*v-1);
        var rr = rWorld * Math.cbrt(w);
        var dx = rr*Math.sin(phi)*Math.cos(theta);
        var dy = rr*Math.sin(phi)*Math.sin(theta)*0.7;
        var dz = rr*Math.cos(phi);
        var wy = trunk + rWorld*0.5 + dy;
        var planR = Math.hypot(wx+dx, wz+dz) / SCALE;
        var col = KIND_COLOR.tree, variance = 0.9+Math.random()*0.2;
        var ang = Math.random()*Math.PI*2, rad = 1.0+Math.random()*3.5;
        particles.push({
          tx:wx+dx, ty:Math.max(0.05,wy), tz:wz+dz,
          sx:wx+dx+Math.cos(ang)*rad, sy:wy+1.0+Math.random()*3.0, sz:wz+dz+Math.sin(ang)*rad,
          size:(1.3+Math.random()*0.6)*0.05,
          color:[col[0]*variance,col[1]*variance,col[2]*variance],
          triggerPlanR: planR,
          delayJitter:(Math.random()-0.5)*0.5,
          settleDur: SETTLE_DUR_MIN + Math.random()*(SETTLE_DUR_MAX-SETTLE_DUR_MIN),
          phase: Math.random()*Math.PI*2,
          twinkleSpeed: 0.5+Math.random()*1.1
        });
      }
    }
    function sampleTreeRow(pathPts, treeCount, clusterR, perCluster){
      for(var i=0;i<treeCount;i++){
        var t = i/(treeCount-1);
        var segIdx = Math.min(Math.floor(t*(pathPts.length-1)), pathPts.length-2);
        var localT = (t*(pathPts.length-1)) - segIdx;
        var p0=pathPts[segIdx], p1=pathPts[segIdx+1];
        var cx = p0[0]+(p1[0]-p0[0])*localT;
        var cy = p0[1]+(p1[1]-p0[1])*localT;
        sampleTreeCanopy(cx, cy, clusterR, perCluster);
      }
    }

    // ---- The masterplan layout ----
    sampleRectGround(1300,0,130,H, 500, 'road', 1.3);
    sampleRectGround(1358,0,14,H, 90, 'road', 1.0);
    sampleRectGround(880,0,420,95, 150, 'road', 1.2);
    sampleRectGround(90,250,1210,32, 150, 'road', 1.1);

    var roofRectsA = [
      [90,0,190,95],[300,5,140,80],[460,0,110,95],[590,15,150,75],
      [760,0,120,90],[900,10,130,80],[1050,0,110,95]
    ];
    roofRectsA.forEach(function(r){ sampleRectBuilding(r[0],r[1],r[2],r[3], Math.round(r[2]*r[3]/700)); });

    sampleRectGround(90,95,970,55, 150, 'road', 1.1);
    [[420,115],[460,115],[500,113],[620,120],[655,120],[690,118]].forEach(function(c){
      sampleCircleClusterGround(c[0],c[1],7,5,'building',1.2);
    });

    var roofRectsB = [
      [90,155,150,100],[280,150,150,95],[470,155,140,95],[650,150,150,100],[850,150,160,100]
    ];
    roofRectsB.forEach(function(r){ sampleRectBuilding(r[0],r[1],r[2],r[3], Math.round(r[2]*r[3]/700)); });

    var towerRoof = [[1155,110],[1310,95],[1320,280],[1160,295]];
    samplePolyBuilding(towerRoof, 220);
    for(var i=0;i<9;i++){
      var cx = 1185 + (i%3)*55, cy = 145 + Math.floor(i/3)*55;
      sampleCircleClusterGround(cx,cy,15,7,'building',1.1);
    }

    var rowA = [[110,270],[420,255],[640,300],[900,300],[1150,275],[1280,260]];
    var rowB = [[130,340],[430,330],[660,390],[900,380],[1150,345],[1280,325]];
    sampleTreeRow(rowA, 24, 15, 9);
    sampleTreeRow(rowB, 24, 15, 9);

    sampleRectGround(700,390,300,140, 420, 'plaza', 1.0);
    for(var gx=700; gx<=1000; gx+=30){ sampleLineGround([[gx,390],[gx,530]], 3, 3, 'plaza', 0.9); }
    for(var gy=390; gy<=530; gy+=30){ sampleLineGround([[700,gy],[1000,gy]], 3, 3, 'plaza', 0.9); }
    sampleCircleClusterGround(665,405,32,70,'plaza',1.0);

    [[1060,420,26],[1140,470,20],[1220,440,24],[1080,520,18],[1180,540,22]].forEach(function(g){
      sampleCircleClusterGround(g[0],g[1],g[2],22,'garden',1.2);
    });
    sampleLineGround([[1010,400],[1080,380],[1160,400],[1240,420],[1290,460]], 45, 10, 'garden', 0.9);

    var tealRoof = [
      [290,435],[420,415],[560,405],
      [580,430],[605,420],[625,450],[600,465],[625,490],[598,505],
      [618,530],[588,545],[605,570],[575,585],
      [560,615],[470,655],[370,650],[300,595],[272,505]
    ];
    samplePolyBuilding(tealRoof, 380);
    sampleRectBuilding(300,378,170,45, 70);
    sampleCircleClusterGround(300,470,16,20,'building',1.2);

    sampleRectGround(260,655,370,140, 120, 'garden', 0.9);
    [[320,700,20],[400,740,24],[480,700,18],[550,745,22],[300,770,16],[450,780,20]].forEach(function(c){
      sampleTreeCanopy(c[0],c[1],c[2], 16);
    });

    sampleRectBuilding(650,600,500,105, 480);
    for(var x=680;x<1140;x+=45){ sampleLineGround([[x,605],[x,700]], 3, 2, 'building', 0.9); }

    sampleRectBuilding(870,705,550,95, 440);

    sampleRectGround(950,815,350,90, 100, 'road', 1.1);
    [[980,835],[1030,835],[1080,840],[1130,838],[1180,842],[1230,840],[1280,838]].forEach(function(c){
      sampleCircleClusterGround(c[0],c[1],7,6,'building',1.2);
    });

    var walkway = [[75,795],[760,778],[762,900],[78,918]];
    samplePolyBuilding(walkway, 320);

    sampleRectBuilding(820,955,340,95, 200);
    for(var i2=0;i2<8;i2++){
      var cx2 = 860 + (i2%4)*70, cy2 = 985 + Math.floor(i2/4)*40;
      sampleCircleClusterGround(cx2,cy2,10,6,'building',1.1);
    }

    var atrium = [[35,385],[150,395],[190,755],[0,770]];
    samplePolyBuilding(atrium, 200);
    for(var i3=-3;i3<=8;i3++){
      sampleLineGround([[0+i3*22,760],[190+i3*22,390]], 4, 4, 'building', 0.9);
    }
    for(var gy2=395; gy2<=755; gy2+=32){ sampleLineGround([[0,gy2],[190,gy2]], 3, 3, 'building', 0.8); }

    return particles;
  }

  // Load real scanned/exported particle data (from TouchDesigner) instead of the
  // procedural fake layout. Expects an array of {tx,ty,tz,r,g,b,size,layer}.
  function loadFromScan(url){
    return fetch(url).then(function(resp){ return resp.json(); }).then(function(data){
      return data.map(function(p){
        var ang = Math.random()*Math.PI*2, rad = 1.2 + Math.random()*4.5;
        return {
          tx:p.tx, ty:p.ty, tz:p.tz,
          sx:p.tx + Math.cos(ang)*rad,
          sy:p.ty + 1.0 + Math.random()*3.2,
          sz:p.tz + Math.sin(ang)*rad,
          size:p.size,
          color:[p.r, p.g, p.b],
          triggerPlanR: Math.hypot(p.tx, p.tz) / SCALE,
          delayJitter:(Math.random()-0.5)*0.5,
          settleDur: SETTLE_DUR_MIN + Math.random()*(SETTLE_DUR_MAX-SETTLE_DUR_MIN),
          phase: Math.random()*Math.PI*2,
          twinkleSpeed: 0.5 + Math.random()*1.1,
          layer: p.layer
        };
      });
    });
  }

  return {
    buildSite: buildSite,
    loadFromScan: loadFromScan,
    KIND_COLOR: KIND_COLOR,
    W: W, H: H, SCALE: SCALE, CX: CX, CZ: CZ,
    MAX_PLAN_RADIUS: MAX_PLAN_RADIUS,
    SETTLE_DUR_MIN: SETTLE_DUR_MIN, SETTLE_DUR_MAX: SETTLE_DUR_MAX
  };
})();
