// Simplified, restored "perfect" behavior JS
// Features: open/close, two floating GIF wrappers with separate paths and durations,
// drag-to-move with momentum, percent-based persistence, and simple heart spawn on click.

window._gifOrig = window._gifOrig || { g1: {}, g2: {} };

$(function() {
  var envelope = $("#envelope");
  var envelopeWrapper = $(".envlope-wrapper");
  var btn_open = $("#open");
  var celebrationGif = $("#celebration-gif");
  var celebrationGif2 = $("#celebration-gif-2");

  function open() {
    console.log('[GIF] open() clicked');
    // Ensure wrappers/positions are prepared before revealing GIFs
    try { saveOriginalPositions(); } catch(e){ console.warn('saveOriginalPositions failed',e); }
    envelope.addClass('open').removeClass('close');
    envelopeWrapper.addClass('letter-open');
    // apply original/saved positions first, then reveal
    setTimeout(function(){
      applyOriginalGifPositions();
      applySavedGifPositions();
      celebrationGif.addClass('show');
      if (celebrationGif2 && celebrationGif2.length) celebrationGif2.addClass('show');
      // mark wrappers active so they accept pointer events
      try{ $('#celebration-gif-wrap, #celebration-gif-2-wrap').addClass('active'); }catch(e){}
      // play background music if available (user interaction allows play)
      try{
        var bg = document.getElementById('bg-music');
        if (bg){ bg.volume = 0.85; var p = bg.play(); if (p && p.then) p.catch(function(err){ console.warn('bg-music play blocked', err); }); }
      }catch(err){ console.warn('could not play bg music', err); }
    }, 30);
  }
  // expose open for direct onclick fallback
  try { window._openFromButton = open; } catch(e){}

  function close(resetToOriginal) {
    console.log('[GIF] close() called', !!resetToOriginal);
    envelope.addClass('close').removeClass('open');
    envelopeWrapper.removeClass('letter-open');
    if (resetToOriginal) {
      try { localStorage.removeItem('gifPos_celebration-gif'); localStorage.removeItem('gifPos_celebration-gif-2'); } catch(e){}
    }
    resetGifPositions();
    celebrationGif.removeClass('show');
    if (celebrationGif2 && celebrationGif2.length) celebrationGif2.removeClass('show');
    // remove active so wrappers don't block UI
    try{ $('#celebration-gif-wrap, #celebration-gif-2-wrap').removeClass('active'); }catch(e){}
    // pause/rewind background music
    try{ var bg = document.getElementById('bg-music'); if (bg){ bg.pause(); bg.currentTime = 0; } }catch(e){ }
  }

  envelope.on('dblclick', function(e){ e.stopPropagation(); close(true); });
  $(".letter").on('dblclick', function(e){ e.stopPropagation(); close(true); });
  $(document).on('dblclick', '.words', function(e){ e.stopPropagation(); close(true); });

  // simple heart spawn on pointerdown/click
  function spawnAtClick(x,y) { if (typeof x==='number'&&typeof y==='number') createHeartAt(x,y); }
  if (window.PointerEvent) {
    document.addEventListener('pointerdown', function(e){ spawnAtClick(e.clientX,e.clientY); }, {passive:true});
  } else {
    // older devices: prefer touchstart for immediate coordinates, fallback to click
    document.addEventListener('touchstart', function(e){ if (!e.touches||e.touches.length===0) return; var t=e.touches[0]; spawnAtClick(t.clientX,t.clientY); }, {passive:true});
    document.addEventListener('click', function(e){ spawnAtClick(e.clientX,e.clientY); }, {passive:true});
  }

  btn_open.on('click', open);

  // set up the gif wrappers + drag
  setupGifControls();
});

// --- GIF controls ---
function setupGifControls(){
  var g1 = $('#celebration-gif');
  var g2 = $('#celebration-gif-2');

  function ensureWrapped($gif){
    if (!$gif || !$gif.length) return null;
    var $parent = $gif.parent();
    if ($parent && $parent.hasClass && $parent.hasClass('gif-wrap')) return $parent;
    var origId = $gif.attr('id') || '';
    var wrapId = origId ? (origId + '-wrap') : ('gif-wrap-' + Math.random().toString(36).slice(2));
    var $wrap = $('<div class="gif-wrap gif-floating"></div>').attr('id', wrapId);
    // keep the original id on the inner GIF so id-targeted CSS still applies
    // (we'll give the wrapper its own id below)
    // append the wrapper to the document body so it's not clipped by
    // envelope/letter containers (keeps it on top of the page)
    $wrap.append($gif);
    $(document.body).append($wrap);
    var rect = $gif[0].getBoundingClientRect();
    var left = Math.round(rect.left), top = Math.round(rect.top);
    if (rect.width===0 || rect.height===0 || top > window.innerHeight + 500) {
      if (origId === 'celebration-gif') { left = window.innerWidth - 280; top = window.innerHeight - 300; }
      else { left = 20; top = window.innerHeight - 250; }
    }
    // default wrapper should not capture pointer events until GIF is shown
    $wrap.css({ position: 'fixed', display: 'block', left: left + 'px', top: top + 'px', width: (rect.width||260) + 'px', height: (rect.height||260) + 'px', pointerEvents: 'none', zIndex: 12005 });
    $gif.css({ position: 'absolute', left:0, top:0, width:'100%', height:'100%', transform: '' });
    // set animation per GIF (12s/14s) and small random delay
    var delay = Math.floor(Math.random()*1200)-600;
    var dur = (origId==='celebration-gif-2')?14000:12000;
    var anim = (origId==='celebration-gif-2')?'gifFly2':'gifFly';
    try { $wrap[0].style.setProperty('animation-name', anim, 'important'); $wrap[0].style.setProperty('animation-duration', dur+'ms', 'important'); $wrap[0].style.setProperty('animation-delay', delay+'ms'); }
    catch(e){ $wrap.css({'animation-name':anim,'animation-duration':dur+'ms','animation-delay':delay+'ms'}); }
    return $wrap;
  }

  function saveOriginalPositions(){
    if (!g1.length || !g2.length) return;
    var w1 = ensureWrapped(g1), w2 = ensureWrapped(g2);
    if (w1) g1 = w1; if (w2) g2 = w2;
    var s1 = window.getComputedStyle(g1[0]), s2 = window.getComputedStyle(g2[0]);
    window._gifOrig.g1 = { left: s1.left, top: s1.top, right: s1.right, bottom: s1.bottom, position: s1.position };
    window._gifOrig.g2 = { left: s2.left, top: s2.top, right: s2.right, bottom: s2.bottom, position: s2.position };
  }

  window.applyOriginalGifPositions = applyOriginalGifPositions;
  window.resetGifPositions = resetGifPositions;
  window.saveOriginalGifPositions = saveOriginalPositions;
  window.applySavedGifPositions = applySavedGifPositions;

  function applySavedGifPositions(){
    try{
      var raw1 = localStorage.getItem('gifPos_celebration-gif');
      var raw2 = localStorage.getItem('gifPos_celebration-gif-2');
      if (raw1 && g1.length){ var p1 = JSON.parse(raw1); if (p1.leftPct!=null && p1.topPct!=null){ var left1=Math.round(p1.leftPct*window.innerWidth), top1=Math.round(p1.topPct*window.innerHeight); var w=g1[0].offsetWidth||0,h=g1[0].offsetHeight||0; left1=Math.max(0,Math.min(window.innerWidth-w,left1)); top1=Math.max(0,Math.min(window.innerHeight-h,top1)); g1.css({position:'fixed',left:left1+'px',top:top1+'px',right:'auto',bottom:'auto'}); } }
      if (raw2 && g2.length){ var p2 = JSON.parse(raw2); if (p2.leftPct!=null && p2.topPct!=null){ var left2=Math.round(p2.leftPct*window.innerWidth), top2=Math.round(p2.topPct*window.innerHeight); var w2=g2[0].offsetWidth||0,h2=g2[0].offsetHeight||0; left2=Math.max(0,Math.min(window.innerWidth-w2,left2)); top2=Math.max(0,Math.min(window.innerHeight-h2,top2)); g2.css({position:'fixed',left:left2+'px',top:top2+'px',right:'auto',bottom:'auto'}); } }
    }catch(e){ console.warn('Could not apply saved gif positions',e); }
  }

  function applyOriginalGifPositions(){
    if (!g1.length||!g2.length) return;
    if (window._gifOrig.g1 && window._gifOrig.g1.position){ g1.css({position:(window._gifOrig.g1.position||'fixed')}); if (window._gifOrig.g1.left && window._gifOrig.g1.left!=='auto') g1.css({left:window._gifOrig.g1.left,right:'auto'}); else if (window._gifOrig.g1.right && window._gifOrig.g1.right!=='auto') g1.css({right:window._gifOrig.g1.right,left:'auto'}); if (window._gifOrig.g1.top && window._gifOrig.g1.top!=='auto') g1.css({top:window._gifOrig.g1.top,bottom:'auto'}); else if (window._gifOrig.g1.bottom && window._gifOrig.g1.bottom!=='auto') g1.css({bottom:window._gifOrig.g1.bottom,top:'auto'}); }
    if (window._gifOrig.g2 && window._gifOrig.g2.position){ g2.css({position:(window._gifOrig.g2.position||'fixed')}); if (window._gifOrig.g2.left && window._gifOrig.g2.left!=='auto') g2.css({left:window._gifOrig.g2.left,right:'auto'}); else if (window._gifOrig.g2.right && window._gifOrig.g2.right!=='auto') g2.css({right:window._gifOrig.g2.right,left:'auto'}); if (window._gifOrig.g2.top && window._gifOrig.g2.top!=='auto') g2.css({top:window._gifOrig.g2.top,bottom:'auto'}); else if (window._gifOrig.g2.bottom && window._gifOrig.g2.bottom!=='auto') g2.css({bottom:window._gifOrig.g2.bottom,top:'auto'}); }
    g1.addClass && g1.addClass('gif-floating'); g2.addClass && g2.addClass('gif-floating');
  }

  function resetGifPositions(){
    if (!g1.length||!g2.length) return;
    if (window._gifOrig.g1 && window._gifOrig.g1.position){ g1.animate({ left:(window._gifOrig.g1.left && window._gifOrig.g1.left!=='auto')?window._gifOrig.g1.left:undefined, top:(window._gifOrig.g1.top && window._gifOrig.g1.top!=='auto')?window._gifOrig.g1.top:undefined, right:(window._gifOrig.g1.right && window._gifOrig.g1.right!=='auto')?window._gifOrig.g1.right:undefined, bottom:(window._gifOrig.g1.bottom && window._gifOrig.g1.bottom!=='auto')?window._gifOrig.g1.bottom:undefined },350,function(){ applyOriginalGifPositions(); }); }
    if (window._gifOrig.g2 && window._gifOrig.g2.position){ g2.animate({ left:(window._gifOrig.g2.left && window._gifOrig.g2.left!=='auto')?window._gifOrig.g2.left:undefined, top:(window._gifOrig.g2.top && window._gifOrig.g2.top!=='auto')?window._gifOrig.g2.top:undefined, right:(window._gifOrig.g2.right && window._gifOrig.g2.right!=='auto')?window._gifOrig.g2.right:undefined, bottom:(window._gifOrig.g2.bottom && window._gifOrig.g2.bottom!=='auto')?window._gifOrig.g2.bottom:undefined },350,function(){ applyOriginalGifPositions(); }); }
  }

  // dragging and momentum
  function makeDraggable($inner, $wrapper){
    function clampToViewport(left, top, wrapper){ var w=(wrapper&&wrapper[0]&&wrapper[0].offsetWidth)||0; var h=(wrapper&&wrapper[0]&&wrapper[0].offsetHeight)||0; var minLeft=0,minTop=0; var maxLeft=Math.max(0,window.innerWidth-w); var maxTop=Math.max(0,window.innerHeight-h); return { left: Math.max(minLeft, Math.min(maxLeft, left)), top: Math.max(minTop, Math.min(maxTop, top)) }; }
    if (window.PointerEvent){
      $inner.on('pointerdown', function(e){ if (e.pointerType==='mouse' && e.button!==0) return; e.preventDefault(); var innerNode=$inner[0]; try{ innerNode.setPointerCapture && innerNode.setPointerCapture(e.pointerId);}catch(_){} var wrapRect=$wrapper[0].getBoundingClientRect(); var startLeft=wrapRect.left,startTop=wrapRect.top,startX=e.clientX,startY=e.clientY; var targetLeft=startLeft,targetTop=startTop, rafId=null, lastSamples=[]; $inner.addClass('dragging'); $wrapper.addClass('paused'); function applyTransform(){ rafId=null; var dx=targetLeft-startLeft, dy=targetTop-startTop; $inner.css('transform','translate3d('+dx+'px,'+dy+'px,0)'); } function onMove(ev){ targetLeft=startLeft+(ev.clientX-startX); targetTop=startTop+(ev.clientY-startY); var cl=clampToViewport(Math.round(targetLeft),Math.round(targetTop),$wrapper); targetLeft=cl.left; targetTop=cl.top; lastSamples.push({x:ev.clientX,y:ev.clientY,t:Date.now()}); if (lastSamples.length>5) lastSamples.shift(); if (!rafId) rafId=requestAnimationFrame(applyTransform); } function endDrag(ev){ window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', endDrag); if (rafId){ cancelAnimationFrame(rafId); rafId=null;} $inner.removeClass('dragging'); $wrapper.removeClass('paused'); var finalLeft=Math.round(targetLeft), finalTop=Math.round(targetTop); $inner.css({transform:''}); var vx=0,vy=0; if (lastSamples.length>=2){ var s1=lastSamples[0], s2=lastSamples[lastSamples.length-1], dt=Math.max(1,s2.t-s1.t); vx=(s2.x-s1.x)/dt; vy=(s2.y-s1.y)/dt; } startMomentum($wrapper, finalLeft, finalTop, vx*16, vy*16); try{ var key='gifPos_'+($wrapper.attr('id')||Math.random().toString(36).slice(2)); localStorage.setItem(key, JSON.stringify({ leftPct: finalLeft/window.innerWidth, topPct: finalTop/window.innerHeight })); }catch(e){} try{ innerNode.releasePointerCapture && innerNode.releasePointerCapture(ev?ev.pointerId:undefined);}catch(_){} } window.addEventListener('pointermove', onMove, { passive: true }); window.addEventListener('pointerup', endDrag); });
    } else {
      $inner.on('touchstart', function(e){ if (!e.touches||e.touches.length===0) return; e.preventDefault(); var touch=e.touches[0]; var wrapRect=$wrapper[0].getBoundingClientRect(); var startLeft=wrapRect.left,startTop=wrapRect.top,startX=touch.clientX,startY=touch.clientY; var targetLeft=startLeft,targetTop=startTop, rafId=null, lastSamples=[]; $inner.addClass('dragging'); $wrapper.addClass('paused'); function applyTransform(){ rafId=null; var dx=targetLeft-startLeft, dy=targetTop-startTop; $inner.css('transform','translate3d('+dx+'px,'+dy+'px,0)'); } function onTouchMove(ev){ if (!ev.touches||ev.touches.length===0) return; var t=ev.touches[0]; targetLeft=startLeft+(t.clientX-startX); targetTop=startTop+(t.clientY-startY); var cl=clampToViewport(Math.round(targetLeft),Math.round(targetTop),$wrapper); targetLeft=cl.left; targetTop=cl.top; lastSamples.push({x:t.clientX,y:t.clientY,t:Date.now()}); if (lastSamples.length>5) lastSamples.shift(); if (!rafId) rafId=requestAnimationFrame(applyTransform); } function onTouchEnd(ev){ window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', onTouchEnd); if (rafId){ cancelAnimationFrame(rafId); rafId=null;} $inner.removeClass('dragging'); $wrapper.removeClass('paused'); var finalLeft=Math.round(targetLeft), finalTop=Math.round(targetTop); $inner.css({transform:''}); var vx=0,vy=0; if (lastSamples.length>=2){ var s1=lastSamples[0], s2=lastSamples[lastSamples.length-1], dt=Math.max(1,s2.t-s1.t); vx=(s2.x-s1.x)/dt; vy=(s2.y-s1.y)/dt; } startMomentum($wrapper, finalLeft, finalTop, vx*16, vy*16); try{ var key='gifPos_'+($wrapper.attr('id')||Math.random().toString(36).slice(2)); localStorage.setItem(key, JSON.stringify({ leftPct: finalLeft/window.innerWidth, topPct: finalTop/window.innerHeight })); }catch(e){} } window.addEventListener('touchmove', onTouchMove, { passive:false }); window.addEventListener('touchend', onTouchEnd); });
    }
  }

  // initialize
  saveOriginalPositions();
  applyOriginalGifPositions();
  var inner1 = g1.children().first(); var inner2 = g2.children().first(); if (inner1 && inner1.length) makeDraggable(inner1, g1); if (inner2 && inner2.length) makeDraggable(inner2, g2);
}

function startMomentum($wrapper, startLeft, startTop, vx, vy){ var left=startLeft, top=startTop, friction=0.92, minSpeed=0.25, prevTime=performance.now(); function step(){ var now=performance.now(), dt=Math.max(1, now-prevTime); prevTime=now; left+=vx; top+=vy; var w=($wrapper[0]&&$wrapper[0].offsetWidth)||0, h=($wrapper[0]&&$wrapper[0].offsetHeight)||0; var minLeft=0,minTop=0,maxLeft=Math.max(0,window.innerWidth-w), maxTop=Math.max(0,window.innerHeight-h); if (left<minLeft){ left=minLeft; vx=-vx*0.35;} if (left>maxLeft){ left=maxLeft; vx=-vx*0.35;} if (top<minTop){ top=minTop; vy=-vy*0.35;} if (top>maxTop){ top=maxTop; vy=-vy*0.35;} $wrapper.css({ left: Math.round(left) + 'px', top: Math.round(top) + 'px' }); vx*=friction; vy*=friction; if (Math.abs(vx)>minSpeed || Math.abs(vy)>minSpeed) requestAnimationFrame(step); else { try{ var key='gifPos_'+($wrapper.attr('id')||Math.random().toString(36).slice(2)); localStorage.setItem(key, JSON.stringify({ leftPct: Math.round(left)/window.innerWidth, topPct: Math.round(top)/window.innerHeight })); }catch(e){} } } requestAnimationFrame(step); }

// spawn hearts and helper
function createHeartAt(x,y){ var el=document.createElement('div'); el.className='flow-heart'; var jitterX=(Math.random()-0.5)*8, jitterY=(Math.random()-0.5)*8, margin=6; var left=Math.max(margin, Math.min(window.innerWidth-margin, x + jitterX)); var top=Math.max(margin, Math.min(window.innerHeight-margin, y + jitterY)); el.style.left = left + 'px'; el.style.top = top + 'px'; var dur = 1600 + Math.floor(Math.random()*1000); el.style.animationDuration = dur + 'ms'; document.body.appendChild(el); requestAnimationFrame(function(){ el.style.animationPlayState='running'; }); el.addEventListener('animationend', function(){ if (el && el.parentNode) try{ el.parentNode.removeChild(el); }catch(e){} }); setTimeout(function(){ if (el && el.parentNode) try{ el.parentNode.removeChild(el); }catch(e){} }, 4000); }

function createBurstAt(x,y,count){ for (var i=0;i<count;i++){ (function(i){ setTimeout(function(){ var spread=18 + i*6; var angle=(Math.PI/8)*(i - (count-1)/2); var dx=Math.cos(angle)*(Math.random()*spread); var dy=Math.sin(angle)*(Math.random()*spread) - (Math.random()*6); createHeartAt(x + dx, y + dy); }, i * 60); })(i); } }
