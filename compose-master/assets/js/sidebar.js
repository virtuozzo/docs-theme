/*
 * Docs sidebar: menu, version and language switchers, mobile panel. No jQuery.
 *
 * The page holds the top level of the menu and the branch of the current page
 * (layouts/partials/sidebar/branch.html). The whole tree is in menu.json
 * (data-menu of .aside-menu-wrapp); an item whose children are not in the page has
 * data-id ("3.1.4": positions from the top), and its children are rendered from
 * menu.json when it is opened. renderItem() builds the same markup as
 * layouts/partials/sidebar/item.html.
 */
// Leading semicolon: this file is concatenated after others in js/bundle.js.
;(function () {
    'use strict';

    var SLIDE_MS = 200;

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    // ---- menu.json -------------------------------------------------------

    var menuPromise = null;

    function loadMenu(wrap) {
        if (!menuPromise) {
            var url = wrap.getAttribute('data-menu');
            menuPromise = url
                ? fetch(url, {credentials: 'same-origin'}).then(function (response) {
                    if (!response.ok) {
                        throw new Error('menu.json: HTTP ' + response.status);
                    }
                    return response.json();
                })
                : Promise.reject(new Error('menu.json: no data-menu'));
            // A failed load may be retried on the next click.
            menuPromise.catch(function () {
                menuPromise = null;
            });
        }
        return menuPromise;
    }

    // "3.1.4" -> tree[3].k[1].k[4]
    function findNode(tree, id) {
        var node = null;
        var level = tree;
        var parts = id.split('.');
        for (var i = 0; i < parts.length; i++) {
            node = level && level[Number(parts[i])];
            if (!node) {
                return null;
            }
            level = node.k;
        }
        return node;
    }

    // ---- rendering (same markup as sidebar/item.html and sidebar/branch.html) ----

    function renderItem(node, id, level) {
        var li = document.createElement('li');
        if (node.c) {
            li.className = node.c;
        }
        if (node.k && node.k.length) {
            li.setAttribute('data-id', id);
        }

        var item = document.createElement('span');
        item.className = 'aside-menu-item';

        if (node.i) {
            var img = document.createElement('img');
            img.src = node.i.s;
            img.width = node.i.w;
            img.height = node.i.h;
            img.alt = node.t;
            item.appendChild(img);
        }

        if (node.h) {
            var a = document.createElement('a');
            a.href = node.h;
            if (node.t) {
                a.title = node.t;
            }
            if (node.x) {
                a.target = '_blank';
            }
            if (node.r) {
                a.rel = 'noopener';
            }
            // Titles come from this site's own front matter and may hold markup, as in the page.
            a.innerHTML = node.t;
            item.appendChild(a);
            if (node.p) {
                var pdf = document.createElement('a');
                pdf.href = node.p;
                pdf.className = 'menu-pdf';
                item.appendChild(pdf);
            }
        } else {
            var label = document.createElement('span');
            label.textContent = node.t;
            item.appendChild(label);
        }

        li.appendChild(item);
        return li;
    }

    function renderList(nodes, parentId, level) {
        var ul = document.createElement('ul');
        ul.className = 'menu-level-' + level;
        nodes.forEach(function (node, index) {
            ul.appendChild(renderItem(node, parentId + '.' + index, level));
        });
        return ul;
    }

    function levelOf(li) {
        var ul = li.parentElement;
        var match = ul && /(?:^|\s)menu-level-(\d+)(?:\s|$)/.exec(ul.className);
        return match ? Number(match[1]) : 1;
    }

    function childList(li) {
        for (var el = li.firstElementChild; el; el = el.nextElementSibling) {
            if (el.tagName === 'UL') {
                return el;
            }
        }
        return null;
    }

    // ---- opening and closing ---------------------------------------------

    function animateHeight(el, from, to, done) {
        if (!el.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            done();
            return;
        }
        el.style.overflow = 'hidden';
        var animation = el.animate([{height: from + 'px'}, {height: to + 'px'}], {duration: SLIDE_MS, easing: 'ease'});
        animation.onfinish = animation.oncancel = function () {
            el.style.overflow = '';
            done();
        };
    }

    function open(li, ul) {
        li.classList.add('expanded');
        animateHeight(ul, 0, ul.scrollHeight, function () {});
    }

    function close(li, ul) {
        animateHeight(ul, ul.offsetHeight, 0, function () {
            li.classList.remove('expanded');
        });
    }

    // An item opened at the bottom of a list is scrolled into view, as the jQuery version did.
    function revealIfLast(wrap, li) {
        if (li !== li.parentElement.lastElementChild) {
            return;
        }
        setTimeout(function () {
            var overflow = li.getBoundingClientRect().bottom - wrap.getBoundingClientRect().bottom;
            if (overflow > 0) {
                wrap.scrollTo({top: wrap.scrollTop + overflow, behavior: 'smooth'});
            }
        }, SLIDE_MS + 100);
    }

    function toggle(wrap, li) {
        var ul = childList(li);
        if (ul) {
            if (li.classList.contains('expanded')) {
                close(li, ul);
            } else {
                open(li, ul);
                revealIfLast(wrap, li);
            }
            return;
        }

        var id = li.getAttribute('data-id');
        if (!id) {
            // No children: nothing to open (the jQuery version only toggled the class).
            li.classList.toggle('expanded');
            return;
        }

        li.classList.add('loading');
        loadMenu(wrap).then(function (tree) {
            li.classList.remove('loading');
            var node = findNode(tree, id);
            if (!node || !node.k || !node.k.length || childList(li)) {
                return;
            }
            ul = renderList(node.k, id, levelOf(li) + 1);
            li.appendChild(ul);
            open(li, ul);
            revealIfLast(wrap, li);
        }).catch(function () {
            li.classList.remove('loading');
            // Without menu.json the item's own page still leads to its children.
            var link = li.querySelector(':scope > .aside-menu-item > a[href]');
            if (link) {
                window.location.href = link.href;
            }
        });
    }

    function initMenu() {
        var wrap = document.querySelector('.aside-menu-wrapp');
        if (!wrap) {
            return;
        }

        wrap.addEventListener('click', function (event) {
            var item = event.target.closest('.aside-menu-item');
            if (!item || !wrap.contains(item) || event.target.closest('a')) {
                return;
            }
            toggle(wrap, item.parentElement);
        });

        // Load menu.json ahead of the first click, once the visitor turns to the menu.
        var prefetch = function () {
            loadMenu(wrap).catch(function () {});
            wrap.removeEventListener('pointerenter', prefetch);
            wrap.removeEventListener('focusin', prefetch);
            wrap.removeEventListener('touchstart', prefetch);
        };
        wrap.addEventListener('pointerenter', prefetch);
        wrap.addEventListener('focusin', prefetch);
        wrap.addEventListener('touchstart', prefetch, {passive: true});

        // Scroll the menu to the open top-level section.
        var expanded = wrap.querySelector('.menu-level-1 > .expanded');
        if (expanded) {
            var box = expanded.parentNode.parentNode;
            box.scrollTop = expanded.offsetTop - box.offsetTop;
        }
    }

    // ---- version and language switchers --------------------------------

    function initSwitchers() {
        ['.versions', '.langs'].forEach(function (selector) {
            document.querySelectorAll(selector + ' span').forEach(function (span) {
                span.addEventListener('click', function () {
                    span.closest(selector).classList.toggle('active');
                });
            });
        });

        // A click anywhere else closes them.
        document.addEventListener('click', function (event) {
            ['.versions', '.langs'].forEach(function (selector) {
                if (!event.target.closest(selector)) {
                    document.querySelectorAll(selector + '.active').forEach(function (el) {
                        el.classList.remove('active');
                    });
                }
            });
        });
    }

    // ---- mobile panel ----------------------------------------------------

    function closePanel() {
        document.body.classList.remove('menu-open');
        document.querySelectorAll('.aside-mob').forEach(function (el) {
            el.classList.remove('aside-mob');
        });
    }

    function initMobile() {
        document.addEventListener('click', function (event) {
            if (event.target.closest('.sidebar-menu')) {
                document.body.classList.add('menu-open');
                document.querySelectorAll('.aside').forEach(function (el) {
                    el.classList.add('aside-mob');
                });
                return;
            }
            // Only a click on the backdrop itself, not on the menu inside it.
            var target = event.target;
            if (target.classList && (target.classList.contains('aside-mob') || target.classList.contains('hide-sidebar-menu'))) {
                closePanel();
            }
        });

        window.addEventListener('resize', function () {
            if (window.innerWidth > 900) {
                closePanel();
            }
        });
    }

    ready(function () {
        initMenu();
        initSwitchers();
        initMobile();
    });
}());
