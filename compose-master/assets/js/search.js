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
    that.fuseOptions = {
        shouldSort: true,
        includeMatches: true,
        threshold: 0.0,
        tokenize: true,
        location: 0,
        distance: 20,
        maxPatternLength: 32,
        minMatchCharLength: 30,
        keys: [
            {name: "title", weight: 0.8},
            {name: "description", weight: 0.6},
            {name: "contents", weight: 0.4}
        ]
    };
    that.search = $("#docs-search");
    that.searchResults = $("#search-results");

    that.executeSearch = function () {
        $.getJSON("{{ .Site.BaseURL }}index.json", function (data) {
            var pages = data;
            var fuse = new Fuse(pages, that.fuseOptions);
            var result = fuse.search(that.searchQuery);
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

    that.populateResults = function (result) {
        $.each(result, function (key, value) {
            var contents = value.item.description;
            var snippet = "";
            var snippetHighlights = [];
            var tags = [];
            if (that.fuseOptions.tokenize) {
                snippetHighlights.push(that.searchQuery);
            } else {
                $.each(value.matches, function (matchKey, mvalue) {
                    if (mvalue.key == "tags" || mvalue.key == "categories") {
                        snippetHighlights.push(mvalue.value);
                    } else if (mvalue.key == "contents") {
                        start = mvalue.indices[0][0] - summaryInclude > 0 ? mvalue.indices[0][0] - summaryInclude : 0;
                        end = mvalue.indices[0][1] + summaryInclude < contents.length ? mvalue.indices[0][1] + summaryInclude : contents.length;
                        snippet += contents.substring(start, end);
                        snippetHighlights.push(mvalue.value.substring(mvalue.indices[0][0], mvalue.indices[0][1] - mvalue.indices[0][0] + 1));
                    }
                });
            }

            if (snippet.length < 1) {
                snippet += contents.substring(0, that.summaryInclude * 2) + '...';
            }

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

        }

        that.searchResults.append(pagination);

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







