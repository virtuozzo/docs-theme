$(function () {
    $('.header-search--button').click(function () {
        $('#search-outer').toggleClass('open')
    });

    $('.search-box--close').click(function () {
        $('#search-outer').toggleClass('open')
    });


});

$(document).on('click', '.clear-search', function (e) {
    $('.search-box-side form').removeClass('active').find('[name="s"]').val('');
    $('#search-results').html("<p>Please enter search query...</p>");
});
$(document).on('keyup', '.search-box-side input', function (e) {
    var form = $(this).closest('form');
    if ($(this).val() !== '') {
        form.addClass('active');
    } else {
        form.removeClass('active');
    }
});

var Docs = window.Docs || {};

Docs.Search = (function (that) {
    that.summaryInclude = 130;

    // Fields of index.json that are searched, in order of importance.
    that.fields = ["title", "description", "contents"];

    // Fuzzy search. Used only as a fallback, when the literal search finds
    // nothing and the query contains no quoted phrase, so that a typo such as
    // "kubernetess cluster" still returns the Kubernetes topics.
    that.fuseOptions = {
        shouldSort: true,
        includeMatches: true,
        threshold: 0.3,
        tokenize: true,
        matchAllTokens: true,
        location: 0,
        distance: 100000,
        maxPatternLength: 32,
        minMatchCharLength: 3,
        keys: [
            {name: "title", weight: 0.8},
            {name: "description", weight: 0.6},
            {name: "contents", weight: 0.4}
        ]
    };
    that.search = $("#docs-search");
    that.searchResults = $("#search-results");

    // Splits a query into quoted phrases and single words:
    // backup "management node" old -> {phrases: ["management node"], words: ["backup", "old"]}
    that.parseQuery = function (query) {
        var phrases = [];
        var rest = query.replace(/[“”]/g, '"').replace(/"([^"]*)"/g, function (match, phrase) {
            phrase = $.trim(phrase);
            if (phrase) {
                phrases.push(phrase);
            }
            return ' ';
        });
        var words = $.trim(rest.replace(/"/g, ' ')).split(/\s+/);
        words = $.grep(words, function (word) {
            return word.length > 0;
        });
        return {
            phrases: phrases,
            words: words,
            terms: phrases.concat(words),
            // The query as one string, used to rank whole-query matches highest.
            whole: $.trim(query.replace(/["“”]/g, ' ').replace(/\s+/g, ' '))
        };
    };

    that.fieldText = function (page, field) {
        return typeof page[field] === 'string' ? page[field] : '';
    };

    // Literal, case-insensitive search: every phrase and every word must occur
    // in the page as typed. A quoted phrase is never matched fuzzily.
    that.literalSearch = function (pages, parsed) {
        var terms = $.map(parsed.terms, function (term) {
            return term.toLowerCase();
        });
        var whole = parsed.whole.toLowerCase();
        var fields = that.fields;
        var results = [];

        $.each(pages, function (pageKey, page) {
            var haystack = $.map(fields, function (field) {
                return that.fieldText(page, field).toLowerCase();
            });
            var anchor = null;

            // Reject the page as soon as one term is missing everywhere.
            for (var t = 0; t < terms.length; t++) {
                var found = false;
                for (var f = 0; f < fields.length; f++) {
                    var position = haystack[f].indexOf(terms[t]);
                    if (position !== -1) {
                        if (!anchor || f < anchor.field) {
                            anchor = {field: f, position: position};
                        }
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return;
                }
            }

            // Rank by the most important field that holds the whole query.
            var rank = fields.length;
            for (var r = 0; r < fields.length; r++) {
                var complete = true;
                for (var i = 0; i < terms.length; i++) {
                    if (haystack[r].indexOf(terms[i]) === -1) {
                        complete = false;
                        break;
                    }
                }
                if (complete) {
                    rank = r;
                    break;
                }
            }

            // A page containing the query as one uninterrupted string wins
            // over a page that merely contains all of its words.
            var bonus = 0;
            if (whole) {
                if (haystack[0].indexOf(whole) !== -1) {
                    bonus = -0.6;
                } else if (haystack[1].indexOf(whole) !== -1) {
                    bonus = -0.3;
                } else if (haystack[2].indexOf(whole) !== -1) {
                    bonus = -0.1;
                }
            }

            results.push({
                item: page,
                highlights: parsed.terms,
                anchor: {field: fields[anchor.field], position: anchor.position},
                score: rank + bonus,
                titleLength: that.fieldText(page, 'title').length
            });
        });

        results.sort(function (a, b) {
            return a.score - b.score
                || a.anchor.position - b.anchor.position
                || a.titleLength - b.titleLength;
        });
        return results;
    };

    that.fuzzySearch = function (pages, query) {
        var fuse = new Fuse(pages, that.fuseOptions);
        return $.map(fuse.search(query), function (result) {
            return {item: result.item, highlights: [query], anchor: null};
        });
    };

    that.executeSearch = function () {
        $.getJSON("{{ .Site.BaseURL }}index.json", function (data) {
            var pages = data;
            var parsed = that.parseQuery(that.searchQuery);
            var result = that.literalSearch(pages, parsed);

            // A quoted phrase is a request for that exact wording: if it is not
            // in the docs, say so rather than offering approximate matches.
            if (!result.length && !parsed.phrases.length) {
                result = that.fuzzySearch(pages, that.searchQuery);
            }

            if (result.length > 0) {

                that.pag_pages = Math.ceil(result.length / that.per_page);

                if (that.paged > 1) {
                    that.offset = that.per_page * (that.paged - 1);
                }

                for (var i = that.offset; i < that.offset + that.per_page; i++) {
                    if (result[i]) {
                        that.to_render.push(result[i]);
                    }
                }

                if (!that.to_render.length) {
                    that.searchResults.removeClass('loading').append("<p>No matches found</p>");
                } else {
                    that.populateResults(that.to_render);
                }

            } else {
                that.searchResults.removeClass('loading').append("<p>No matches found</p>");
            }
        });
    };

    // index.json is built from .Plain, which leaves HTML entities encoded
    // (&lt;value&gt;). Decode first, then escape once, so that a snippet shows
    // <value> rather than the entity, and no markup from a page reaches the DOM.
    that.decodeEntities = function (text) {
        return $('<textarea>').html(text).val() || '';
    };

    that.escapeHtml = function (text) {
        return $('<div>').text(text).html().replace(/\$\{/g, '$\u200B{');
    };

    // Excerpt taken around the match, so that a result shows the text that was
    // searched for. Falls back to the page description.
    that.buildSnippet = function (value) {
        var page = value.item;
        var anchor = value.anchor;
        var source = '';

        if (anchor && anchor.field === 'contents') {
            source = that.decodeEntities(that.fieldText(page, 'contents'));
        }
        if (!source) {
            source = that.decodeEntities(
                that.fieldText(page, 'description') || that.fieldText(page, 'contents')
            );
        }
        if (!source) {
            return '';
        }

        // Locate the term again in the decoded text, since decoding shifts positions.
        var position = -1;
        if (anchor && anchor.field === 'contents' && value.highlights && value.highlights.length) {
            position = source.toLowerCase().indexOf(value.highlights[0].toLowerCase());
        }

        if (position < 0) {
            return that.escapeHtml(source.substring(0, that.summaryInclude * 2))
                + (source.length > that.summaryInclude * 2 ? '...' : '');
        }

        var start = Math.max(position - that.summaryInclude, 0);
        var end = Math.min(position + that.summaryInclude * 2, source.length);
        return (start > 0 ? '...' : '')
            + that.escapeHtml(source.substring(start, end))
            + (end < source.length ? '...' : '');
    };


    that.populateResults = function (result) {
        $.each(result, function (key, value) {
            var snippet = that.buildSnippet(value);
            var snippetHighlights = value.highlights || [];

            //pull template from hugo templarte definition
            var templateDefinition = $('#search-result-template').html();
            //replace values
            var output = that.render(templateDefinition, {
                key: key,
                title: value.item.title,
                link: value.item.permalink,
                tags: value.item.tags,
                categories: value.item.categories,
                snippet: snippet
            });

            that.searchResults.removeClass('loading').append(output);

            $.each(snippetHighlights, function (snipkey, snipvalue) {
                $("#summary-" + key).mark(snipvalue);
            });

        });


        if (that.pag_pages > 1) {
            var pagination = '<div class="pagination">';

            for (var i = 1; i <= that.pag_pages; i++) {
                if (that.paged == i) {
                    pagination += '<span>' + i + '</span>';
                } else {
                    pagination += '<a href="' + that.replaceUrlParam(window.location.href, 'paged', i) + '">' + i + '</a>';
                }
            }

            pagination += '</div>';

            that.searchResults.append(pagination);
        }

    };

    that.param = function (name) {
        return decodeURIComponent((location.search.split(name + '=')[1] || '').split('&')[0]).replace(/\+/g, ' ');
    };

    that.replaceUrlParam = function (url, paramName, paramValue) {
        if (paramValue == null) {
            paramValue = '';
        }
        var pattern = new RegExp('\\b(' + paramName + '=).*?(&|#|$)');
        if (url.search(pattern) >= 0) {
            return url.replace(pattern, '$1' + paramValue + '$2');
        }
        url = url.replace(/[?#]$/, '');
        return url + (url.indexOf('?') > 0 ? '&' : '?') + paramName + '=' + paramValue;
    };

    that.render = function (templateString, data) {
        var conditionalMatches, conditionalPattern, copy;
        conditionalPattern = /\$\{\s*isset ([a-zA-Z]*) \s*\}(.*)\$\{\s*end\s*}/g;
        //since loop below depends on re.lastInxdex, we use a copy to capture any manipulations whilst inside the loop
        copy = templateString;
        while ((conditionalMatches = conditionalPattern.exec(templateString)) !== null) {
            if (data[conditionalMatches[1]]) {
                //valid key, remove conditionals, leave contents.
                copy = copy.replace(conditionalMatches[0], conditionalMatches[2]);
            } else {
                //not valid, remove entire section
                copy = copy.replace(conditionalMatches[0], '');
            }
        }
        templateString = copy;
        //now any conditionals removed we can do simple substitution
        var key, find, re;
        for (key in data) {
            find = '\\$\\{\\s*' + key + '\\s*\\}';
            re = new RegExp(find, 'g');
            templateString = templateString.replace(re, data[key]);
        }
        return templateString;
    };

    that.searchQuery = that.param("s").trim();
    if (that.searchQuery) {
        that.search.val(that.searchQuery).closest('form').addClass('active');
        that.paged = that.param("paged") || 1;
        that.per_page = 10;
        that.pag_pages = 0;
        that.offset = 0;
        that.to_render = [];
        that.executeSearch();
        that.searchResults.addClass('loading');
    } else {
        that.searchResults.append("<p>Please enter search query...</p>");
    }

}(Docs.Search || {}));
