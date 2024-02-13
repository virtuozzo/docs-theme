// lazy load youtube
// https://webdesign.tutsplus.com/tutorials/how-to-lazy-load-embedded-youtube-videos--cms-26743
jQuery(document).ready(function ($) {
    var youtube = document.querySelectorAll(".youtube-lazy");

    for (var i = 0; i < youtube.length; i++) {
        let current_youtube = youtube[i];
        current_youtube.setAttribute('data-ready', "0");
        if (current_youtube.dataset.placename) {
            var source = "/wp-content/themes/salient/img/youtube/" + current_youtube.dataset.placename + ".jpg";
        } else {
            var source = "https://img.youtube.com/vi/" + current_youtube.dataset.embed + "/maxresdefault.jpg"; // sddefault.jpg maxresdefault.jpg  hqdefault.jpg
        }

        var image = new Image();
        image.src = source;
        if (current_youtube.dataset.alt) {
            image.alt = current_youtube.dataset.alt;
        }

        image.addEventListener("load", function () {
            current_youtube.appendChild(image);
        }(i));


        current_youtube.addEventListener("click", function () {
            LoadYouTubeFrame(this, true)
        });

        // setTimeout((current_youtube) => {
        //     LoadYouTubeFrame(current_youtube)
        // }, 2000, current_youtube);


    }
    ;

    function LoadYouTubeFrame(current_youtube, autoplay = false) {
        if (current_youtube.dataset.ready == '1') {
            return;
        }
        let iframe = document.createElement("iframe");

        let rel_attribute = '?rel=0&autohide=1&showinfo=0';
        if (autoplay == true) {
            rel_attribute = rel_attribute + '&autoplay=1&mute=1'
        }

        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute("allow", "autoplay");
        iframe.setAttribute("src", "https://www.youtube.com/embed/" + current_youtube.dataset.embed + rel_attribute);
        iframe.setAttribute("title", current_youtube.dataset.title);

        current_youtube.innerHTML = "";
        current_youtube.appendChild(iframe);

        current_youtube.setAttribute('data-ready', "1");
    }


});
