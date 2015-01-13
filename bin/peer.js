!function(t,e,n){var o=function(){function t(){this.events={},this.callback=[]}var e=/[\s\,]+/,n="*";return t.prototype.on=function(t,n){if(t===!0)n.call(this);else if("object"==typeof t)for(var o in t)this.on(o,t[o]);else if(t.match(e))for(var i=0,a=t.split(e);i<a.length;i++)this.on(a[i],n);else n&&(this.events[t]||(this.events[t]=[]),this.events[t].push(n));return this},t.prototype.one=function(t,e){var n=this;this.on(t,function o(){n.off(t,o),e.apply(n,arguments)})},t.prototype.emit=function(t,o,i){var a=this;if(!t)throw t;var r;o=o||{},o.preventDefault=function(){r=!0};var s=t.split(e);s.push(n);for(var c=0;c<s.length;c++){var l=s[c],d=this.events[l];if(d)for(var f=0;f<d.length;f++){var h=d[f];if(h){var u=[o,i];l===n&&u.unshift(t),h.apply(a,u)}}}return!r&&"default:"+t in this.events&&this.events["default:"+t].forEach(function(t){t&&t.call(a,o,i)}),this},t.prototype.off=function(t,n){for(var o=t.split(e),i=0;i<o.length;i++){var a=t[r];if(this.events[a])for(var r=0;r<this.events[a].length;r++)this.events[a][r]===n&&(this.events[a][r]=null)}},t}(),i=function b(t,e){for(var n,o=Array.prototype.splice.call(arguments,1),i=0;i<o.length;i++)if(e=o[i],"object"==typeof t&&"object"==typeof e)for(n in e)t[n]=b(t[n],e[n]);else t=e;return t},a=t.PeerConnection||t.webkitPeerConnection00||t.webkitRTCPeerConnection||t.mozRTCPeerConnection,r=function(t){var e,n;try{e=new t({iceServers:[{url:"stun:localhost"}]}),n=e.createDataChannel("supportCheck",{reliable:!1}),n.close(),e.close()}catch(o){}return{rtc:!!e,datachannel:!!n}}(a),s=function(t,n){var o=e.createElement("script");o.src=t,o.async=!0,o.onreadystatechange=function(){"complete"==this.readyState&&n()},o.onload=n;var i=e.getElementsByTagName("script")[0],a=i.parentNode;a&&a.insertBefore(o,i)},c=function(t){var e=[];return function(){var n=this;this.init=function(o,i){var a,r=function(){a||(a=!1,socket=io.connect(o),socket.on("message",function(t){if(t=JSON.parse(t),"callback_response"in t){var o=t.callback_response;return delete t.callback_response,void e[o](t)}n.emit.call(n,t.type,t,function(e){"callback_id"in t&&(e.to=t.from,e.callback_response=t.callback_id,socket.send(JSON.stringify(e)))})}))};return"undefined"==typeof io&&t((o||"")+"/socket.io/socket.io.js",r),i&&this.one("socket:connect",i),this},this.disconnect=function(){socket&&socket.disconnect()},this.send=function(t,o,i){"object"==typeof t?(i=o,o=t,t=o.type):o.type=t;i&&(o.callback_id=e.length,e.push(i));var a=function(){socket.send(JSON.stringify(o))};return this.id?a():n.one("socket:connect",a),this},n.one("socket:connect",function(t){n.id=t.id})}}(s),l=function(){this.tag=function(t){return t instanceof Array||(t=[t]),this.send("presence:tag",{data:t}),this},this.watch=function(t){return t instanceof Array||(t=[t]),this.send("presence:watch",{to:t}),this}},d=function(t){function e(t){this.id=t,this.constraints={},this.streams={},this.state="connect"}function n(t,e){if(e)for(var n in e){var o=e[n];o&&(t[n]=o)}}return function(){function o(t){var e={},o={};for(var i in this.threads){var a=this.threads[i],r=a.streams;t in r&&(n(o,r[t]),n(e,a.constraints))}this.emit("stream:change",{id:t,local:e,remote:o})}this.threads={},this.thread=function(n,o){"object"!=typeof n&&n||(o||(o=n||{}),n=(1e18*Math.random()).toString(36));var i,a=this.threads[n];if(a?o?(a.constraints||(a.constraints={}),t(a.constraints,o),i="thread:change"):o===!1&&(a.constraints=!1,i="thread:disconnect"):(a=this.threads[n]=new e(n),a.constraints=o||{},i="thread:connect"),i){var r={thread:n};o&&(r.constraints=a.constraints),this.send(i,r),this.emit(i,r)}return a},this.on("thread:connect, thread:change",function(e){var n=e.from;if(!e.thread)throw Error("thread:* event fired without a thread value");var i=this.thread(e.thread);if(n){if(n in i.streams?t(i.streams[n],e.constraints||{}):i.streams[n]=e.constraints||{},o.call(this,n),!e.to){var a={to:n,thread:i.id,constraints:i.constraints};this.send("thread:connect",a)}}else for(n in i.streams)o.call(this,n)}),this.on("thread:disconnect",function(t){var e,n=this.threads[t.thread];if("from"in t)e=t.from,e in n.streams&&(delete n.streams[e],o.call(this,e));else for(e in threads.stream)o.call(this,e)})}}(i),f=t.RTCSessionDescription||t.mozRTCSessionDescription,h=function(t){return function(){var e=Array.prototype.splice.call(arguments,0);return e.unshift({}),t.apply(null,e)}}(i),u=function S(t,e){var n;if(typeof t!=typeof e)return!1;if("object"==typeof t){for(n in t)if(!S(t[n],e[n]))return!1;for(n in e)if(!(n in t))return!1}return t===e},m=function(t,e,n,o,i,a){function r(o,r,c,d){function f(t){if(t&&v.push(t),"stable"===p.signalingState){var e=v.shift();e&&e()}}function h(t){console.error("SET Description failed triggered:",t)}function u(t){console.debug("DATACHANNEL CREATED",t),t.onopen=function(t){y.emit("channel:connect",{type:"channel:connect",id:o,from:o,to:d.id,target:t})},t.onmessage=function(t){var e=JSON.parse(t.data);e.from=o,e.to=d.id,e.target=t,y.emit("channel:message",e)},t.onerror=function(t){t.id=o,y.emit("channel:error",t)}}function m(){if(p&&"closed"!==p.readyState){if(!y.constraints.local.video||!y.constraints.remote.video||!s)return void p.getLocalStreams().forEach(function(t){f(function(){p.removeStream(t)})});var t=!1;p.getLocalStreams().forEach(function(e){s===e&&(t=!0)}),t||(f(function(){p.addStream(s)}),s.addEventListener("addtrack",function(){}),s.addEventListener("removetrack",function(){}))}}var p,v=[],y=new a,g=o<d.id;y.channel=null,y.constraints={remote:{},local:{}},y.setConstraints=function(t){var e;t.local&&!i(y.constraints.local,t.local)&&(e=!0),n(y.constraints,t||{}),m(),e&&d.send({type:"stream:constraints",remote:y.constraints.local,to:o})},y.on("stream:disconnected",function(){y.remotemedia&&(y.emit("media:disconnect",y.remotemedia),y.one("stream:connected",function(){y.emit("media:connect",y.remotemedia)}))});var b={iceServers:[{url:c}]},S={optional:[{DtlsSrtpKeyAgreement:!0}]};try{y.pc=p=new t(b,S),p.onicecandidate=function(t){var e=t.candidate;e&&d.send({type:"stream:candidate",data:{label:e.label||e.sdpMLineIndex,candidate:e.toSdp?e.toSdp():e.candidate},to:o})}}catch(k){return console.error("PeerJS: Failed to create PeerConnection, exception: "+k.message),y}return p.onsignalingstatechange=function(){f()},p.oniceconnectionstatechange=function(){console.warn("ICE-CONNECTION-STATE-CHANGE "+p.iceConnectionState),y.emit("stream:"+p.iceConnectionState,{from:o})},p.onaddstream=function(t){t.from=o,y.emit("media:connect",t),y.remotemedia=t,m()},p.onremovestream=function(t){remotemedia=null,t.from=o,y.emit("media:disconnect",t),m()},p.ondatachannel=function(t){y.channel=t.channel,u(t.channel)},p.onnegotiationneeded=function(){return"closed"===p.signalingState?void console.warn("signallingState closed"):void(g?p.createOffer(function(t){f(function(){p.setLocalDescription(t,function(){d.send({type:"stream:offer",to:o,data:p.localDescription})},h)})},null,l):d.send({type:"stream:makeoffer",to:o}))},y.addStream=function(t){s=t,m()},y.removeStream=function(){s=null,m()},y.open=function(t){t?p.setRemoteDescription(new e(t),function(){return"closed"===p.signalingState?void console.warn("signalingState closed: during setRemoteDescription"):void p.createAnswer(function(t){return"closed"===p.signalingState?void console.warn("signalingState closed: after createAnswer"):void p.setLocalDescription(t,function(){d.send({type:"stream:answer",to:o,data:p.localDescription})},h)},null,l)}):g&&!y.channel?(y.channel=p.createDataChannel("data"),u(y.channel)):f(p.onnegotiationneeded)},y}var s,c={video:!1},l={optional:[],mandatory:{OfferToReceiveAudio:!0,OfferToReceiveVideo:!0}};return function(){this.streams={},this.stream=function(t,e,n){if(!t)throw"streams(): Expecting an ID";var o=this.streams[t];return o?(e?o.setConstraints(e):void 0!==n&&o.open(n),o):(o=this.streams[t]=r(t,e,this.stun_server,this),e&&o.setConstraints(e),o.on("*",this.emit.bind(this)),this.on("localmedia:connect",o.addStream),this.on("localmedia:disconnect",o.removeStream),this.localmedia&&o.addStream(this.localmedia),o.open(n||null),o)};var t=this.send;this.send=function(e,n,o){"object"==typeof e&&(o=n,n=e,e=n.type);var i=n.to,a=this.streams[i];if(i&&a&&a.channel&&"open"===a.channel.readyState){e&&(n.type=e);var r=JSON.stringify(n);try{return void a.channel.send(r)}catch(s){a.channel=null,this.stream(i,null,null)}}t.call(this,e,n,o)},this.on("stream:connect, stream:change, stream:constraints",function(t){var e={};t.remote&&(e.remote=o(c,t.remote)),t.local&&!t.from&&(e.local=o(c,t.local)),this.stream(t.from||t.id,e)}),this.on("stream:offer, stream:makeoffer",function(t){this.stream(t.from,null,t.data||null)}),this.on("stream:answer",function(t){this.streams[t.from].pc.setRemoteDescription(new e(t.data))}),this.on("stream:candidate",function(t){var e=t.from,n=t.data,o=this.streams[e];if(!o)return void console.error("Candidate needs initiation");var i=new RTCIceCandidate({sdpMLineIndex:n.label,candidate:n.candidate});try{o.pc.addIceCandidate(i)}catch(a){console.error("Failed to set iceCandidate"),console.error(i),console.error(a)}}),this.on("localmedia:disconnect",function(t){for(var e in this.streams)this.streams[e].pc.removeStream(t)}),this.on("channel:connect",function(){}),this.on("channel:message",function(t){if("callback_response"in t){var e=t.callback_response;return delete t.callback_response,void this.callback[e].call(g,t)}var n=t.type;this.emit(n,t,function(e){"callback"in t&&(e.to=t.from,e.callback_response=t.callback,this.send(e))})})}}(a,f,i,h,u,o),p=function(){Function.prototype.bind||(Function.prototype.bind=function(t){if("function"!=typeof this)throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");var e=Array.prototype.slice.call(arguments,1),n=this,o=function(){},i=function(){return n.apply(this instanceof o&&t?this:t,e.concat(Array.prototype.slice.call(arguments)))};return o.prototype=this.prototype,i.prototype=new o,i})}(),v=function(){var t=(n.getUserMedia||n.webkitGetUserMedia||n.mozGetUserMedia||n.msGetUserMedia||n.oGetUserMedia||function(){}).bind(n);return function(e,n,o){try{t(e,n,o)}catch(i){try{t(Object.keys(e).join(","),n,o)}catch(a){o()}}}}(p),y=function(t){return function(){this.localmedia=null,this.addMedia=function(e,n){var o=this,i=function(t){o.localmedia=t,t.addEventListener("ended",function(){o.localmedia&&o.localmedia!==t||(o.emit("localmedia:disconnect",t),o.localmedia=null)}),e&&e(t),o.emit("localmedia:connect",t)};return e instanceof EventTarget?(i(e),this):this.localmedia?(e&&e(this.localmedia),this):(t({audio:!0,video:!0},i,function(t){o.emit("localmedia:failed",t),n()}),this)}}}(v),g=function(e,n,o,i,a,r,s,c){var l="stun:stun.l.google.com:19302",d=Object.create(new e);return n(d,{stun_server:l,support:o}),t.peer=d,i.call(d),a.call(d),r.call(d),s.call(d),c.call(d),t.addEventListener("beforeunload",function(){d.disconnect()}),d}(o,i,r,c,l,d,m,y)}(window,document,navigator);