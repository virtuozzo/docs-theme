// TODO: change $ to vanilajs
jQuery(document).ready(function ($) {

    $(document).on('click', '.collapsible .hwrap', function () {
        $(this).siblings('.bwrap').slideToggle();
    });

    $('.versions span').click(function (e) {
        $(this).closest('.versions').toggleClass('active');
    });

    $(document).click(function(event) {
        var $target = $(event.target);
        if(!$target.closest('.versions').length &&
            $('.versions-list').is(":visible")) {
            $('.versions').removeClass('active')
        }
    });

    $("code[class*='language-']").addClass('line-numbers');

    $('iframe[src*="youtube"]').wrap('<div class="youtube-responsive"></div>');

    //the following hides the menu when a click is registered outside
    $('.logo-part').on('click', 'button', function (e) {
        if (($(e.target).parents('.menu').length === 0) && ($(e.target).hasClass('menu-mobile') == false) && ($(e.target).children('span').hasClass('pagination-switch') == false)) {
            $('.menu-item--opened').removeClass('menu-item--opened');
            $('.menu-mobile--opened').removeClass('menu-mobile--opened');
            $(".menu > ul").removeClass('show-on-mobile');
        }
    });

    $(".menu > ul li").on('click', function () {
        $(this).toggleClass('menu-item--opened')
    });

    $(".menu-mobile").on('click', function (e) {
        $(this).toggleClass('.menu-mobile .menu-mobile .menu-mobile');
        $(".menu > ul").toggleClass('show-on-mobile');
        e.preventDefault();
    });
    /* end of header menu, desktop and mobile */

    var $searchContainer = $('.header #search-outer');
    var $serchInput = $('#search-outer input[type=text]');
    var $searchButton = $('.header-search--button');
    var $closeSearchButton = $('.search-box--close');
    var placeholder = $serchInput.attr('data-placeholder');
    var MaxMobileResolution = 900;

    ////search box event
    $searchButton.mousedown(function () {
        $searchContainer.stop(true).fadeIn(600);
        $serchInput.focus();
        return false;
    });

    $serchInput.keydown(function () {
        if ($(this).attr('value') === placeholder) {
            $(this).attr('value', '');
        }
    });

    $serchInput.keyup(function () {
        if ($(this).attr('value') === '') {
            $(this).attr('value', placeholder);
        }
    });

    // close search btn event
    $closeSearchButton.click(function () {
        closeSearch();
        return false;
    });

    //if user clicks away from the search close it
    $serchInput.blur(function (e) {
        closeSearch();
    });

    function closeSearch() {
        if ($(window).width() >= MaxMobileResolution) {
            $searchContainer.fadeOut('fast');
        }
    }

})


function isObj(obj) {
    return (obj && typeof obj === 'object' && obj !== null) ? true : false;
}

function createEl(element = 'div') {
    return document.createElement(element);
}

function emptyEl(el) {
    while (el.firstChild)
        el.removeChild(el.firstChild);
}

function elem(selector, parent = document) {
    let elem = isObj(parent) ? parent.querySelector(selector) : false;
    return elem ? elem : false;
}

function elems(selector, parent = document) {
    let elems = isObj(parent) ? parent.querySelectorAll(selector) : [];
    return elems.length ? elems : false;
}

function pushClass(el, targetClass) {
    if (isObj(el) && targetClass) {
        let elClass = el.classList;
        elClass.contains(targetClass) ? false : elClass.add(targetClass);
    }
}

function deleteClass(el, targetClass) {
    if (isObj(el) && targetClass) {
        let elClass = el.classList;
        elClass.contains(targetClass) ? elClass.remove(targetClass) : false;
    }
}

function modifyClass(el, targetClass) {
    if (isObj(el) && targetClass) {
        const elClass = el.classList;
        elClass.contains(targetClass) ? elClass.remove(targetClass) : elClass.add(targetClass);
    }
}

function containsClass(el, targetClass) {
    if (isObj(el) && targetClass && el !== document) {
        return el.classList.contains(targetClass) ? true : false;
    }
}

function isChild(node, parentClass) {
    let objectsAreValid = isObj(node) && parentClass && typeof parentClass == 'string';
    return (objectsAreValid && node.closest(parentClass)) ? true : false;
}

function elemAttribute(elem, attr, value = null) {
    if (value) {
        elem.setAttribute(attr, value);
    } else {
        value = elem.getAttribute(attr);
        return value ? value : false;
    }
}

function deleteChars(str, subs) {
    let newStr = str;
    if (Array.isArray(subs)) {
        for (let i = 0; i < subs.length; i++) {
            newStr = newStr.replace(subs[i], '');
        }
    } else {
        newStr = newStr.replace(subs, '');
    }
    return newStr;
}

function isBlank(str) {
    return (!str || str.trim().length === 0);
}

function isMatch(element, selectors) {
    if (isObj(element)) {
        if (selectors.isArray) {
            let matching = selectors.map(function (selector) {
                return element.matches(selector)
            })
            return matching.includes(true);
        }
        return element.matches(selectors)
    }
}

function closestInt(goal, collection) {
    const closest = collection.reduce(function (prev, curr) {
        return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
    });
    return closest;
}

function hasClasses(el) {
    if (isObj(el)) {
        const classes = el.classList;
        return classes.length
    }
}

(function calcNavHeight() {
    const nav = elem('.nav_header');
    const navHeight = nav.offsetHeight + 25;
    const docContent = elem('main');
    docContent.style.paddingTop = `${navHeight}px`;
    return navHeight;
})();

(function markInlineCodeTags() {
    const codeBlocks = elems('code');
    if (codeBlocks) {
        codeBlocks.forEach(function (codeBlock) {
            if (!hasClasses(codeBlock)) {
                codeBlock.children.length ? false : pushClass(codeBlock, 'noClass');
            }
        });
    }
})();

function activeHeading(position, listLinks) {
    let active = 'active';

    let linksToModify = Object.create(null);
    linksToModify.active = listLinks.filter(function (link) {
        return containsClass(link, active);
    })[0];

    // activeTocLink ? deleteClass

    linksToModify.new = listLinks.filter(function (link) {
        return parseInt(link.dataset.position) === position
    })[0];

    if (linksToModify.active != linksToModify.new) {
        linksToModify.active ? deleteClass(linksToModify.active, active) : false;
        pushClass(linksToModify.new, active);
    }
};

function loadActions() {

    const parentURL = '{{ absURL "" }}';
    const doc = document.documentElement;

    (function updateDate() {
        const date = new Date();
        const year = date.getFullYear();
        const yearEl = elem('.year');
        yearEl ? year.innerHTML = year : false;
    })();

    (function customizeSidebar() {
        const tocActive = 'toc_active';
        const aside = elem('aside');
        const tocs = elems('nav', aside);
        if (tocs) {
            tocs.forEach(function (toc) {
                toc.id = "";
                pushClass(toc, 'toc');
                if (toc.children.length >= 1) {
                    const tocItems = Array.from(toc.children[0].children);

                    const previousHeading = toc.previousElementSibling;
                    previousHeading.matches('.active') ? pushClass(toc, tocActive) : false;

                    tocItems.forEach(function (item) {
                        pushClass(item, 'toc_item');
                        pushClass(item.firstElementChild, 'toc_link');
                    })
                }
            });

            const currentToc = elem(`.${tocActive}`);

            if (currentToc) {
                const pageInternalLinks = Array.from(elems('a', currentToc));

                const pageIds = pageInternalLinks.map(function (link) {
                    return link.hash;
                });

                const linkPositions = pageIds.map(function (id) {
                    const heading = elem(id);
                    const position = heading.offsetTop;
                    return position;
                });

                pageInternalLinks.forEach(function (link, index) {
                    link.dataset.position = linkPositions[index]
                });

                window.addEventListener('scroll', function (e) {
                    // this.setTimeout(function(){
                    let position = window.scrollY;
                    let active = closestInt(position, linkPositions);
                    activeHeading(active, pageInternalLinks);
                    // }, 1500)
                });
            }
        }
    })();

    function searchResults(results = [], order = []) {
        let resultsFragment = new DocumentFragment();
        let showResults = elem('.search_results');
        emptyEl(showResults);
        let index = 0
        results.forEach(function (result) {
            let item = createEl('a');
            item.href = result.link;
            item.className = 'search_result';
            item.textContent = result.title;
            item.style.order = order[index];
            resultsFragment.appendChild(item);
            index += 1
        });

        showResults.appendChild(resultsFragment);
    }

    (function search() {
        const searchField = elem('.search_field');

        if (searchField) {
            searchField.addEventListener('input', function () {
                let rawResults = idx.search(`${ this.value }`).slice(0, 6);
                let refs = rawResults.map(function (ref) {
                    // return id and score in a single string
                    return `${ref.ref}:${ref.score}`;
                });

                let ids = refs.map(function (id) {
                    let positionOfSeparator = id.indexOf(":");
                    id = id.substring(0, positionOfSeparator)
                    return Number(id);
                });

                let scores = refs.map(function (score) {
                    let positionOfSeparator = score.indexOf(":");
                    score = score.substring((positionOfSeparator + 1), (score.length - 1));
                    return (parseFloat(score) * 50).toFixed(0);
                });

                let matchedDocuments = simpleIndex.filter(function (doc) {
                    return ids.includes(doc.id);
                });

                matchedDocuments.length >= 1 ? searchResults(matchedDocuments, scores) : false;
            });
        }

    })();

    let headingNodes = [], results, link, icon, current, id,
        tags = ['h2', 'h3', 'h4', 'h5', 'h6'];

    current = document.URL;

    tags.forEach(function (tag) {
        results = document.getElementsByTagName(tag);
        Array.prototype.push.apply(headingNodes, results);
    });

    function sanitizeURL(url) {
        // removes any existing id on url
        const hash = '#';
        const positionOfHash = url.indexOf(hash);
        if (positionOfHash > -1) {
            const id = url.substr(positionOfHash, url.length - 1);
            url = url.replace(id, '');
        }
        return url
    }

    headingNodes.forEach(function (node) {
        link = createEl('a');
        icon = createEl('img');
        icon.src = '{{ print .Site.BaseURL "icons/link.svg" }}';
        link.className = 'link icon';
        link.appendChild(icon);
        id = node.getAttribute('id');
        if (id) {
            link.href = `${sanitizeURL(current)}#${id}`;
            node.appendChild(link);
            pushClass(node, 'link_owner');
        }
    });

    const copyToClipboard = str => {
        let copy, selection, selected;
        copy = createEl('textarea');
        copy.value = str;
        copy.setAttribute('readonly', '');
        copy.style.position = 'absolute';
        copy.style.left = '-9999px';
        selection = document.getSelection();
        doc.appendChild(copy);
        // check if there is any selected content
        selected = selection.rangeCount > 0 ? selection.getRangeAt(0) : false;
        copy.select();
        document.execCommand('copy');
        doc.removeChild(copy);
        if (selected) { // if a selection existed before copying
            selection.removeAllRanges(); // unselect existing selection
            selection.addRange(selected); // restore the original selection
        }
    }


    function copyFeedback(parent) {
        const copyText = document.createElement('span');
        const yanked = 'link_yanked';
        copyText.classList.add(yanked);
        copyText.innerText = 'Link Copied';
        if (!elem(`.${yanked}`, parent)) {
            parent.appendChild(copyText);
            setTimeout(function () {
                // parent.removeChild(copyText)
            }, 3000);
        }
    }

    (function copyHeadingLink() {
        let deeplink, deeplinks, newLink, parent, target;
        deeplink = 'link';
        deeplinks = elems(`.${deeplink}`);
        if (deeplinks) {
            document.addEventListener('click', function (event) {
                target = event.target;
                parent = target.parentNode;
                if (target && containsClass(target, deeplink) || containsClass(parent, deeplink)) {
                    // event.preventDefault();
                    newLink = target.href != undefined ? target.href : target.parentNode.href;
                    copyToClipboard(newLink);
                    target.href != undefined ? copyFeedback(target) : copyFeedback(target.parentNode);
                }
            });
        }
    })();

    document.addEventListener('mouseout', function (event) {
        target = event.target;
        parent = target.parentNode;
        if (target && containsClass(target, 'link_owner') || containsClass(parent, 'link_owner')) {
            link_yanked = parent.getElementsByClassName('link_yanked');
            if (link_yanked.length) {
                link_yanked[0].remove();
            }
        }
    });
}

$(document).ready(function () {
    loadActions();

    if (window.location.hash) {
        $('html, body').animate({
            scrollTop: $(window.location.hash).offset().top
        }, {
            duration: 100,
            easing: "linear"
        });
    }

    var expandedEl = $("div.menu-item.open"),
        nextAfterExanded;


    $('.aside .menu-item-title').click(function () {

        if(!$(event.target).is('a')) { 
            $(this).toggleClass('open');
            $(this).next('ul').slideToggle(200);

            var those = $(this),
                parent = this.parentNode;
            setTimeout(function () {
                // if last child
                if (parent === parent.parentNode.children[parent.parentNode.children.length-1]) {
                    if(those.length && those.position().top){
                        $(".menu-items-wrapp").animate({ scrollTop: $(".menu-items-wrapp").scrollTop()+those.offset().top }, { duration: 'medium', easing: 'swing' });

                    }
                }
            }, 300);
        }
    });

    if (expandedEl.length) {
        nextAfterExanded = expandedEl.closest('.menu-item')[0] || expandedEl[0];
        if (nextAfterExanded) {
            nextAfterExanded.parentNode.scrollTop = nextAfterExanded.offsetTop - nextAfterExanded.parentNode.offsetTop;
        }
    }


    // NEW SIDEBAR

    $('.aside-menu-wrapp .current-page').parents('li').addClass('expanded');
 
    expandedEl = $('.menu-level-1 > .expanded');
    
    if (expandedEl.length) {
        expandedEl = expandedEl[0];
        console.log(expandedEl.parentNode);
        expandedEl.parentNode.parentNode.scrollTop = expandedEl.offsetTop - expandedEl.parentNode.parentNode.offsetTop;
    }

    $('.aside-menu-item').click(function (event) {
        var $el = $(this);
        if(!$(event.target).is('a')) { 
            $(this).next('ul').slideToggle(200);
            // setTimeout(function(){
                $el.parent().toggleClass('expanded');
            // }, 200)

            var those = $(this),
                parent = this.parentNode;
            setTimeout(function () {
                // if last child
                if (parent === parent.parentNode.children[parent.parentNode.children.length-1]) {
                    if(those.length && those.position().top){
                        $(".aside-menu-wrapp").animate({ scrollTop: $(".aside-menu-wrapp").scrollTop()+those.offset().top }, { duration: 'medium', easing: 'swing' });

                    }
                }
            }, 300);
        }
    });

    // NEW SIDEBAR END
});

(function() {
    var EXPANDED = "expanded";

    $(".sub-menu-item_has-child span").click(function () {
        $(this).next('ul').slideToggle(200);
    });

    window.onresize = function() {
        if (window.innerWidth > 900) {
            $('.aside').removeClass('aside-mob');
            $('body').removeClass('menu-open');
        }
    };

    $(document).on('click', '.sidebar-menu', function (e) {
        $('body').addClass('menu-open');
        $('.aside').addClass('aside-mob');
    });


    $(document).on('click', '.aside-mob, .hide-sidebar-menu', function (e) {
        if (e.target !== this)
            return;

        $('body').removeClass('menu-open');
        $('.aside-mob').removeClass('aside-mob');
    });

    $(".aside .menu-item ul li.subitem-expandable, .aside .menu-item ul li.expandable").click(function (event) {
        if(!$(event.target).is('a')) { 
            $(this).toggleClass("open");
            $(this).find("ul").toggleClass(EXPANDED);
            event.stopPropagation();
        }
    });

    
})();