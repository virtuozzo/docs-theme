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

    // Fuzzy search. Used only as a last resort, when neither the phrase nor the
    // tokens are found and the query contains no quoted phrase, so that a typo
    // such as "kubernetess cluster" still returns the Kubernetes topics.
    // These options are Fuse.js 3.2.0 (compose-master/assets/js/fuse.min.js):
    // tokenize + matchAllTokens give per-word fuzzy matching with an AND between
    // words; a large distance keeps a match far from the start of a page from
    // being penalised out of the threshold.
    that.fuseOptions = {
        shouldSort: true,
        includeMatches: true,
        threshold: 0.3,
        tokenize: true,
        matchAllTokens: true,
        location: 0,
        distance: 10000000,
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
            // The query as one string, used for the whole-phrase tiers below.
            whole: $.trim(query.replace(/["“”]/g, ' ').replace(/\s+/g, ' '))
        };
    };

    that.fieldText = function (page, field) {
        return typeof page[field] === 'string' ? page[field] : '';
    };

    // Literal, case-insensitive search. A page qualifies only if every quoted
    // phrase and every word occurs in it verbatim; it is then placed into a tier:
    //
    //   0 .. n-1    the whole query occurs as one uninterrupted string, in
    //               title / description / contents respectively
    //   n .. 2n-1   all tokens occur, and all of them inside a single field
    //   2n          all tokens occur, but scattered across different fields
    //
    // So "management node" ranks a page saying "the management node" above a page
    // that only happens to contain both "management" and "node" far apart.
    that.literalSearch = function (pages, parsed) {
        var fields = that.fields;
        var count = fields.length;

        var terms = $.map(parsed.terms, function (term) {
            return term.toLowerCase();
        });

        // A query made of quote characters alone parses to no terms at all.
        if (!terms.length) {
            return [];
        }

        // The whole-phrase tiers only make sense for a multi-word query; for a
        // single word they would duplicate the token tiers. A quoted phrase is
        // one term but several words, so the test is on the text, not the count.
        var whole = /\s/.test(parsed.whole) ? parsed.whole.toLowerCase() : '';
        var results = [];

        $.each(pages, function (pageKey, page) {
            var haystack = $.map(fields, function (field) {
                return that.fieldText(page, field).toLowerCase();
            });
            var anchor = null;
            var f;

            // Every term must occur somewhere, otherwise the page is rejected.
            // The anchor remembers the most important field that produced a hit,
            // together with the term that hit, so that the snippet can use it.
            for (var t = 0; t < terms.length; t++) {
                var found = false;
                for (f = 0; f < count; f++) {
                    var position = haystack[f].indexOf(terms[t]);
                    if (position !== -1) {
                        if (!anchor || f < anchor.field) {
                            anchor = {field: f, position: position, term: parsed.terms[t]};
                        }
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return;
                }
            }

            // Tier 1: the query as one uninterrupted string.
            var tier = -1;
            if (whole) {
                for (f = 0; f < count; f++) {
                    var wholeAt = haystack[f].indexOf(whole);
                    if (wholeAt !== -1) {
                        tier = f;
                        // The phrase itself is the best possible snippet anchor.
                        anchor = {field: f, position: wholeAt, term: parsed.whole};
                        break;
                    }
                }
            }

            // Tier 2: all tokens, all of them inside one field. The anchor moves
            // to that field too, at its earliest token, so that the snippet is
            // taken where the query actually came together.
            if (tier === -1) {
                for (f = 0; f < count; f++) {
                    var complete = true;
                    var earliest = -1;
                    var earliestTerm = null;
                    for (var i = 0; i < terms.length; i++) {
                        var at = haystack[f].indexOf(terms[i]);
                        if (at === -1) {
                            complete = false;
                            break;
                        }
                        if (earliest === -1 || at < earliest) {
                            earliest = at;
                            earliestTerm = parsed.terms[i];
                        }
                    }
                    if (complete) {
                        tier = count + f;
                        anchor = {field: f, position: earliest, term: earliestTerm};
                        break;
                    }
                }
            }

            // Tier 3: all tokens, scattered across fields.
            if (tier === -1) {
                tier = count * 2;
            }

            results.push({
                item: page,
                highlights: parsed.terms,
                anchor: {field: fields[anchor.field], position: anchor.position, term: anchor.term},
                score: tier,
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

    // Fuse is asked for matches (includeMatches) so that a fuzzy hit can be shown
    // in context too: the raw query is by definition not in the text verbatim.
    that.fuzzySearch = function (pages, query) {
        var fuse = new Fuse(pages, that.fuseOptions);
        return $.map(fuse.search(query), function (result) {
            var anchor = null;
            var highlights = [];

            $.each(result.matches || [], function (i, match) {
                if (typeof match.value !== 'string' || !match.indices || !match.indices.length) {
                    return;
                }
                var from = match.indices[0][0];
                var text = match.value.substring(from, match.indices[0][1] + 1);
                if (!text) {
                    return;
                }
                highlights.push(text);
                if (!anchor && match.key === 'contents') {
                    anchor = {field: 'contents', position: from, term: text};
                }
            });

            return {
                item: result.item,
                highlights: highlights.length ? highlights : [query],
                anchor: anchor
            };
        });
    };

    that.executeSearch = function () {
        var parsed = that.parseQuery(that.searchQuery);

        if (!parsed.terms.length) {
            that.searchResults.removeClass('loading').append("<p>No matches found</p>");
            return;
        }

        // Each language publishes its own index.json; search.html passes the
        // language-local URL in data-index. Site.BaseURL is only a fallback.
        var indexUrl = that.searchResults.attr('data-index') || "{{ .Site.BaseURL }}index.json";

        $.getJSON(indexUrl, function (data) {
            var pages = data;
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

    // index.json already holds plain, entity-decoded text (layouts/_default/index.json
    // pipes .Plain through htmlUnescape), so values are escaped once here and never
    // decoded in the browser: jQuery .html() would execute a <script> from a page.
    that.escapeHtml = function (text) {
        return $('<div>').text(text).html();
    };

    that.escapeAttr = function (text) {
        return that.escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    // Excerpt taken around the match, so that a result shows the text that was
    // searched for. Falls back to the page description.
    that.buildSnippet = function (value) {
        var page = value.item;
        var anchor = value.anchor;
        var contents = that.fieldText(page, 'contents');
        var term = (anchor && anchor.term) || (value.highlights || [])[0] || '';
        var position = -1;

        // An excerpt from the page text is preferred even when the hit itself was
        // in the title: the title is already shown above the snippet. The index is
        // not decoded at runtime, so a recorded position is still valid.
        if (contents) {
            if (anchor && anchor.field === 'contents' && typeof anchor.position === 'number') {
                position = anchor.position;
            } else if (term) {
                position = contents.toLowerCase().indexOf(String(term).toLowerCase());
            }
        }

        var source = contents;
        if (position < 0) {
            source = that.fieldText(page, 'description') || contents;
        }
        if (!source) {
            return '';
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
                title: that.escapeHtml(value.item.title || ''),
                link: that.escapeAttr(value.item.permalink || ''),
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

        // One pass with a callback, so that a substituted value is never rescanned
        // by a later key and never interpreted as a $& / $` / $' replacement
        // pattern. Unknown placeholders are left untouched.
        return copy.replace(/\$\{\s*([a-zA-Z0-9_]+)\s*\}/g, function (match, key) {
            if (!Object.prototype.hasOwnProperty.call(data, key)) {
                return match;
            }
            return data[key] == null ? '' : String(data[key]);
        });
    };

    that.searchQuery = that.param("s").trim();
    if (that.searchQuery) {
        that.search.val(that.searchQuery).closest('form').addClass('active');
        that.paged = that.param("paged") || 1;
        that.per_page = 10;
        that.pag_pages = 0;
        that.offset = 0;
        that.to_render = [];
        // Set before the search runs: executeSearch may finish synchronously.
        that.searchResults.addClass('loading');
        that.executeSearch();
    } else {
        that.searchResults.append("<p>Please enter search query...</p>");
    }

}(Docs.Search || {}));