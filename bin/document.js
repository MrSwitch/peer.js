/**
 * Document.js
 * Adds document navigation to a page.
 */

(function(){

	// fix HTML5 in IE
	var a = "header,section,datalist,option,footer,article,style,script".split(",");
	for( var i=0;i<a.length;i++){
		document.createElement(a[i]);
	}

	// Add mobile ag to page.

	// Insert Meta Tag
	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(create('meta',{
		name:'viewport',
		content:'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
	}), s);


	// Insert on Document Load
	addEvent(document, "DOMContentLoaded", function(){

		var repo = (window.location.pathname||'').match(/[^\/]+/);
		if(repo){
			repo = "https://github.com/MrSwitch/"+repo[0]+"";
		}


		// Add Footer link to repo
		document.body.appendChild(create('footer',{
				html : 'Authored by <a href="http://adodson.com" rel="author">Andrew Dodson</a> (@setData) '+ (repo?'[<a href="'+repo+'">Source and Comments on GitHub</a>]':'')
			}
		));


		function tryitButton(pre,func){
			var btn = create('button',{html:'tryit','class':'tryit'});
			insertAfter(btn, pre);

			addEvent(btn, 'click', function(){
				if(func){
					func();
				}
				else if(typeof(tryit)==='function'&&!tryit(pre.innerText)){
					return
				}else{
					setTimeout( function(){ eval(pre.innerText); }, 100);
				}
			});

			if(!func){
				pre.setAttribute('contenteditable', true);
			}
		}


		// TryIt
		var pres = document.getElementsByTagName('pre');
		for(var i=0;i<pres.length;i++){
			if(pres[i].className === 'tryit'||pres[i].className === 'tryitoffline'){
				// Create a button and insert it after the pre tag
				tryitButton(pres[i]);
			}
		}

		// TryIt, View
		var pres = document.getElementsByTagName('script');
		for(var i=0;i<pres.length;i++){
			(function(script){
				var func = script.getAttribute('data-tryit');

				if(func){
					// Create a button and insert it after the pre tag
					tryitButton(script,window[func]);
				}

				if(script.getAttribute('src')){

					// Add click event to open in new window
					addEvent(script, 'click', function(){
						window.open(script.getAttribute('src'), '_blank');
					});
				}
			})(pres[i]);
		}

		var pres = document.getElementsByTagName('link');
		for(var i=0;i<pres.length;i++){
			(function(script){
				if(script.getAttribute('href')){

					// Add click event to open in new window
					addEvent(script, 'click', function(){
						window.open(script.getAttribute('href'), '_blank');
					});
				}
			})(pres[i]);
		}


		if(!document.querySelector){
			// degrade gracefully
			return;
		}


		// TOC
		var last_depth = 0,
			headings = document.querySelectorAll('h1,h2,h3');
			toc = document.querySelector('nav.toc'),
			_toc = toc;

		if(!toc){
			return;
		}

		for(var i=0;i<headings.length;i++){
			var tag = headings[i];
			// Create an 
			var depth = parseInt(tag.tagName.match(/[0-9]/)[0], 10),
				text = (tag.innerText||tag.innerHTML),
				ref = text.replace(/\W/ig,'');

			var li = create('li', {html: create('a', {href:"#" +ref, text: text }), id : "toc_"+ref});

			if(last_depth < depth){
				var ul = create('ul');
				toc.appendChild(ul);
				ul.appendChild(li);
			}
			else if (last_depth > depth){
				insertAfter(li, toc.parentNode.parentNode);
			}
			else{
				insertAfter(li,toc);
			}
			toc = li;

			// Add anchor
			tag.parentNode.insertBefore(create('a',{name:ref}),tag);

			last_depth = depth;
		}
		// Go back
		toc = _toc;

		// Add scroll event listeners
		addEvent(window, 'scroll', function(e){
			// from the list of items
			// find the one which is in view on the page
			var T = window.scrollY || window.pageYOffset,
				H = ("screen" in window ? window.screen.availHeight : 500);

			for(var i=0;i<headings.length;i++){
				var tag = headings[i],
					text = (tag.innerText||tag.innerHTML),
					ref = text.replace(/\W/ig,'');


				var t = findPos(tag)[1] + 100,
					h = (tag.outerHeight||tag.innerHeight) + 50;

				if( T < t && T+H > t ){

					var a = toc.getElementsByClassName('active');
					for(var j=0;j<a.length;j++){
						a[j].className = '';
					}

					document.getElementById('toc_'+ref).className='active';
					// Stop looping
					return;
				}
			}
		});

		function findPos(obj) {
			var curleft = curtop = 0;
			if (obj.offsetParent) {
				do {
					curleft += obj.offsetLeft;
					curtop += obj.offsetTop;
				} while (obj = obj.offsetParent);
			}
			return [curleft,curtop];
		}
	});

	//
	// Insert After
	function insertAfter(el,ref){
		ref.nextSibling?ref.parentNode.insertBefore(el,ref.nextSibling):ref.parentNode.appendChild(el);
	}

	//
	// Create and Append new Dom elements
	// @param node string
	// @param attr object literal
	// @param dom/string 
	//
	function create(node,attr){

		var n = typeof(node)==='string' ? document.createElement(node) : node;

		if(typeof(attr)==='object' ){
			if( "tagName" in attr ){
				target = attr;
			}
			else{
				for(var x in attr){if(attr.hasOwnProperty(x)){

					if(x === 'text'){
						n.appendChild(document.createTextNode(attr[x]));
					}
					else if(x === 'html'){
						if(typeof(attr[x])==='string'){
							n.innerHTML = attr[x];
						}
						else{
							n.appendChild(attr[x]);
						}
					}
					else if(typeof(attr[x])==='object'){
						for(var y in attr[x]){if(attr[x].hasOwnProperty(y)){
							n[x][y] = attr[x][y];
						}}
					}
					else {
						n.setAttribute(x, attr[x]);
					}
				}}
			}
		}
		return n;
	}

	function addEvent(obj, eventName, listener) { //function to add event
		if (obj.addEventListener) {
			obj.addEventListener(eventName, listener, false);
		} else {
			obj.attachEvent("on" + eventName, listener);
		}
	}

})();


// Google Analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-35317561-1']);
_gaq.push(['_trackPageview']);

(function() {
	var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
	ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
	var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();