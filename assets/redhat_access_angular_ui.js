/*! redhat_access_angular_ui - v0.9.1 - 2014-09-02
 * Copyright (c) 2014 ;
 * Licensed 
 */
/*!
 * Copyright (c) 2006 js-markdown-extra developers
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. The name of the author may not be used to endorse or promote products
 *    derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var MARKDOWN_VERSION = "1.0.1o";
var MARKDOWNEXTRA_VERSION = "1.2.5";

// Global default settings:

/** Change to ">" for HTML output */
var MARKDOWN_EMPTY_ELEMENT_SUFFIX = " />";

/** Define the width of a tab for code blocks. */
var MARKDOWN_TAB_WIDTH = 4;

/** Optional title attribute for footnote links and backlinks. */
var MARKDOWN_FN_LINK_TITLE     = "";
var MARKDOWN_FN_BACKLINK_TITLE = "";

/** Optional class attribute for footnote links and backlinks. */
var MARKDOWN_FN_LINK_CLASS     = "";
var MARKDOWN_FN_BACKLINK_CLASS = "";

/** Change to false to remove Markdown from posts and/or comments. */
var MARKDOWN_WP_POSTS    = true;
var MARKDOWN_WP_COMMENTS = true;

/** Standard Function Interface */
MARKDOWN_PARSER_CLASS = 'MarkdownExtra_Parser';

/**
 * Converts Markdown formatted text to HTML.
 * @param text Markdown text
 * @return HTML
 */
function Markdown(text) {
    //Initialize the parser and return the result of its transform method.
    var parser;
    if('undefined' == typeof arguments.callee.parser) {
        parser = eval("new " + MARKDOWN_PARSER_CLASS + "()");
        parser.init();
        arguments.callee.parser = parser;
    }
    else {
        parser = arguments.callee.parser;
    }
    // Transform text using parser.
    return parser.transform(text);
}

/**
 * Constructor function. Initialize appropriate member variables.
 */
function Markdown_Parser() {

    this.nested_brackets_depth = 6;
    this.nested_url_parenthesis_depth = 4;
    this.escape_chars = "\\\\`*_{}[]()>#+-.!";

    // Document transformations
    this.document_gamut = [
        // Strip link definitions, store in hashes.
        ['stripLinkDefinitions', 20],
        ['runBasicBlockGamut',   30]
    ];

    // These are all the transformations that form block-level
    /// tags like paragraphs, headers, and list items.
    this.block_gamut = [
        ['doHeaders',         10],
        ['doHorizontalRules', 20],
        ['doLists',           40],
        ['doCodeBlocks',      50],
        ['doBlockQuotes',     60]
    ];

    // These are all the transformations that occur *within* block-level
    // tags like paragraphs, headers, and list items.
    this.span_gamut = [
        // Process character escapes, code spans, and inline HTML
        // in one shot.
        ['parseSpan',          -30],
        // Process anchor and image tags. Images must come first,
        // because ![foo][f] looks like an anchor.
        ['doImages',            10],
        ['doAnchors',           20],
        // Make links out of things like `<http://example.com/>`
        // Must come after doAnchors, because you can use < and >
        // delimiters in inline links like [this](<url>).
        ['doAutoLinks',         30],
        ['encodeAmpsAndAngles', 40],
        ['doItalicsAndBold',    50],
        ['doHardBreaks',        60]
    ];

    this.em_relist = [
        ['' , '(?:(^|[^\\*])(\\*)(?=[^\\*])|(^|[^_])(_)(?=[^_]))(?=\\S|$)(?![\\.,:;]\\s)'],
        ['*', '((?:\\S|^)[^\\*])(\\*)(?!\\*)'],
        ['_', '((?:\\S|^)[^_])(_)(?!_)']
    ];
    this.strong_relist = [
        ['' , '(?:(^|[^\\*])(\\*\\*)(?=[^\\*])|(^|[^_])(__)(?=[^_]))(?=\\S|$)(?![\\.,:;]\\s)'],
        ['**', '((?:\\S|^)[^\\*])(\\*\\*)(?!\\*)'],
        ['__', '((?:\\S|^)[^_])(__)(?!_)']
    ];
    this.em_strong_relist = [
        ['' , '(?:(^|[^\\*])(\\*\\*\\*)(?=[^\\*])|(^|[^_])(___)(?=[^_]))(?=\\S|$)(?![\\.,:;]\\s)'],
        ['***', '((?:\\S|^)[^\\*])(\\*\\*\\*)(?!\\*)'],
        ['___', '((?:\\S|^)[^_])(___)(?!_)']
    ];
}

Markdown_Parser.prototype.init = function() {
    // this._initDetab(); // NOTE: JavaScript string length is already based on Unicode
    this.prepareItalicsAndBold();

    // Regex to match balanced [brackets].
    // Needed to insert a maximum bracked depth while converting to PHP.
    // NOTE: JavaScript doesn't have so faster option for RegExp
    //this.nested_brackets_re = new RegExp(
    //    str_repeat('(?>[^\\[\\]]+|\\[', this.nested_brackets_depth) +
    //    str_repeat('\\])*', this.nested_brackets_depth)
    //);
    // NOTE: JavaScript doesn't have so faster option for RegExp
    //this.nested_url_parenthesis_re = new RegExp(
    //    str_repeat('(?>[^()\\s]+|\\(', this.nested_url_parenthesis_depth) +
    //    str_repeat('(?>\\)))*', this.nested_url_parenthesis_depth)
    //);
    this.nested_brackets_re =
        this._php_str_repeat('(?:[^\\[\\]]+|\\[', this.nested_brackets_depth) +
        this._php_str_repeat('\\])*', this.nested_brackets_depth);
    this.nested_url_parenthesis_re =
        this._php_str_repeat('(?:[^\\(\\)\\s]+|\\(', this.nested_url_parenthesis_depth) +
        this._php_str_repeat('(?:\\)))*', this.nested_url_parenthesis_depth);

    // Table of hash values for escaped characters:
    var tmp = [];
    for(var i = 0; i < this.escape_chars.length; i++) {
        tmp.push(this._php_preg_quote(this.escape_chars.charAt(i)));
    }
    this.escape_chars_re = '[' + tmp.join('') + ']';

    // Change to ">" for HTML output.
    this.empty_element_suffix = MARKDOWN_EMPTY_ELEMENT_SUFFIX;
    this.tab_width = MARKDOWN_TAB_WIDTH;

    // Change to `true` to disallow markup or entities.
    this.no_markup = false;
    this.no_entities = false;

    // Predefined urls and titles for reference links and images.
    this.predef_urls = {};
    this.predef_titles = {};

    // Sort document, block, and span gamut in ascendent priority order.
    function cmp_gamut(a, b) {
        a = a[1]; b = b[1];
        return a > b ? 1 : a < b ? -1 : 0;
    }
    this.document_gamut.sort(cmp_gamut);
    this.block_gamut.sort(cmp_gamut);
    this.span_gamut.sort(cmp_gamut);

    // Internal hashes used during transformation.
    this.urls = {};
    this.titles = {};
    this.html_hashes = {};

    // Status flag to avoid invalid nesting.
    this.in_anchor = false;
};

/**
 * [porting note]
 * JavaScript's RegExp doesn't have escape code \A and \Z.
 * So multiline pattern can't match start/end of text. Instead
 * wrap whole of text with STX(02) and ETX(03).
 */
Markdown_Parser.prototype.__wrapSTXETX__ = function(text) {
    if(text.charAt(0) != '\x02') { text = '\x02' + text; }
    if(text.charAt(text.length - 1) != '\x03') { text = text + '\x03'; }
    return text;
};

/**
 * [porting note]
 * Strip STX(02) and ETX(03).
 */
Markdown_Parser.prototype.__unwrapSTXETX__ = function(text) {
    if(text.charAt(0) == '\x02') { text = text.substr(1); }
    if(text.charAt(text.length - 1) == '\x03') { text = text.substr(0, text.length - 1); }
    return text;
};

/**
 *
 */
Markdown_Parser.prototype._php_preg_quote = function(text) {
  if(!arguments.callee.sRE) {
    arguments.callee.sRE = /(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}\\)/g;
  }
  return text.replace(arguments.callee.sRE, '\\$1');
};

Markdown_Parser.prototype._php_str_repeat = function(str, n) {
    var tmp = str;
    for(var i = 1; i < n; i++) {
        tmp += str;
    }
    return tmp;
};

Markdown_Parser.prototype._php_trim = function(target, charlist) {
    var chars = charlist || " \t\n\r";
    return target.replace(
        new RegExp("^[" + chars + "]*|[" + chars + "]*$", "g"), ""
    );
};

Markdown_Parser.prototype._php_rtrim = function(target, charlist) {
    var chars = charlist || " \t\n\r";
    return target.replace(
        new RegExp( "[" + chars + "]*$", "g" ), ""
    );
};

Markdown_Parser.prototype._php_htmlspecialchars_ENT_NOQUOTES = function(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};


/**
 * Called before the transformation process starts to setup parser 
 * states.
 */
Markdown_Parser.prototype.setup = function() {
    // Clear global hashes.
    this.urls = this.predef_urls;
    this.titles = this.predef_titles;
    this.html_hashes = {};

    this.in_anchor = false;
};

/**
 * Called after the transformation process to clear any variable 
 * which may be taking up memory unnecessarly.
 */
Markdown_Parser.prototype.teardown = function() {
    this.urls = {};
    this.titles = {};
    this.html_hashes = {};
};

/**
 * Main function. Performs some preprocessing on the input text
 * and pass it through the document gamut.
 */
Markdown_Parser.prototype.transform = function(text) {
    this.setup();

    // Remove UTF-8 BOM and marker character in input, if present.
    text = text.replace(/^\xEF\xBB\xBF|\x1A/, "");

    // Standardize line endings:
    //   DOS to Unix and Mac to Unix
    text = text.replace(/\r\n?/, "\n", text);

    // Make sure $text ends with a couple of newlines:
    text += "\n\n";

    // Convert all tabs to spaces.
    text = this.detab(text);

    // Turn block-level HTML blocks into hash entries
    text = this.hashHTMLBlocks(text);

    // Strip any lines consisting only of spaces and tabs.
    // This makes subsequent regexen easier to write, because we can
    // match consecutive blank lines with /\n+/ instead of something
    // contorted like /[ ]*\n+/ .
    text = text.replace(/^[ ]+$/m, "");

    // Run document gamut methods.
    for(var i = 0; i < this.document_gamut.length; i++) {
        var method = this[this.document_gamut[i][0]];
        if(method) {
            text = method.call(this, text);
        }
        else {
            console.log(this.document_gamut[i][0] + ' not implemented');
        }
    }

    this.teardown();

    return text + "\n";
};

Markdown_Parser.prototype.hashHTMLBlocks = function(text) {
    if(this.no_markup) { return text; }

    var less_than_tab = this.tab_width - 1;

    // Hashify HTML blocks:
    // We only want to do this for block-level HTML tags, such as headers,
    // lists, and tables. That's because we still want to wrap <p>s around
    // "paragraphs" that are wrapped in non-block-level tags, such as anchors,
    // phrase emphasis, and spans. The list of tags we're looking for is
    // hard-coded:
    //
    // *  List "a" is made of tags which can be both inline or block-level.
    //    These will be treated block-level when the start tag is alone on 
    //    its line, otherwise they're not matched here and will be taken as 
    //    inline later.
    // *  List "b" is made of tags which are always block-level;

    var block_tags_a_re = 'ins|del';
    var block_tags_b_re = 'p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|address|' +
                          'script|noscript|form|fieldset|iframe|math';

    // Regular expression for the content of a block tag.
    var nested_tags_level = 4;
    var attr =
        '(?:'                + // optional tag attributes
            '\\s'            + // starts with whitespace
            '(?:'            +
                '[^>"/]+'    + // text outside quotes
            '|'              +
                '/+(?!>)'    + // slash not followed by ">"
            '|'              +
                '"[^"]*"'    + // text inside double quotes (tolerate ">")
            '|'              +
                '\'[^\']*\'' + // text inside single quotes (tolerate ">")
            ')*'             +
        ')?';
    var content =
        this._php_str_repeat(
            '(?:'                  +
                '[^<]+'            + // content without tag
            '|'                    +
                '<\\2'             + // nested opening tag
                attr               + // attributes
                '(?:'              +
                    '/>'           +
                '|'                +
                    '>',
            nested_tags_level
        )                          + // end of opening tag
        '.*?'                      + // last level nested tag content
        this._php_str_repeat(
                   '</\\2\\s*>'    + // closing nested tag
                ')'                +
                '|'                +
                    '<(?!/\\2\\s*>)' + // other tags with a different name
            ')*',
            nested_tags_level
        );

    var content2 = content.replace('\\2', '\\3');

    // First, look for nested blocks, e.g.:
    //   <div>
    //     <div>
    //       tags for inner block must be indented.
    //     </div>
    //   </div>
    //
    // The outermost tags must start at the left margin for this to match, and
    // the inner nested divs must be indented.
    // We need to do this before the next, more liberal match, because the next
    // match will start at the first `<div>` and stop at the first `</div>`.
    var all = new RegExp('(?:' +
        '(?:'                  +
            '(?:\\n\\n)'       + // Starting after a blank line
            '|'                + // or
            '(?:\\x02)\\n?'    + // the beginning of the doc
        ')'                    +
        '('                    + // save in $1

        // Match from `\n<tag>` to `</tag>\n`, handling nested tags 
        // in between.
            '[ ]{0,' + less_than_tab + '}' +
            '<(' + block_tags_b_re + ')'   + // start tag = $2
            attr + '>'                     + // attributes followed by > and \n
            content                        + // content, support nesting
            '</\\2>'                       + // the matching end tag
            '[ ]*'                         + // trailing spaces/tabs
            '(?=\\n+|\\n*\\x03)'           + // followed by a newline or end of document

        '|' + // Special version for tags of group a.

            '[ ]{0,' + less_than_tab + '}' +
            '<(' + block_tags_a_re + ')'   + // start tag = $3
            attr + '>[ ]*\\n'              + // attributes followed by >
            content2                       + // content, support nesting
            '</\\3>'                       + // the matching end tag
            '[ ]*'                         + // trailing spaces/tabs
            '(?=\\n+|\\n*\\x03)'           + // followed by a newline or end of document

        '|' + // Special case just for <hr />. It was easier to make a special 
              // case than to make the other regex more complicated.

            '[ ]{0,' + less_than_tab + '}' +
            '<(hr)'                        +  // start tag = $2
            attr                           + // attributes
            '/?>'                          + // the matching end tag
            '[ ]*'                         +
            '(?=\\n{2,}|\\n*\\x03)'        + // followed by a blank line or end of document

        '|' + // Special case for standalone HTML comments:

            '[ ]{0,' + less_than_tab + '}' +
            '(?:'                          + //'(?s:' +
                '<!--.*?-->'               +
            ')'                            +
            '[ ]*'                         +
            '(?=\\n{2,}|\\n*\\x03)'        + // followed by a blank line or end of document

        '|' + // PHP and ASP-style processor instructions (<? and <%)

            '[ ]{0,' + less_than_tab + '}' +
            '(?:'                          + //'(?s:' +
                '<([?%])'                  + // $2
                '.*?'                      +
                '\\2>'                     +
            ')'                            +
            '[ ]*'                         +
            '(?=\\n{2,}|\\n*\\x03)'        + // followed by a blank line or end of document

        ')' +
    ')', 'mig');
    // FIXME: JS doesnt have enough escape sequence \A nor \Z.

    var self = this;
    text = this.__wrapSTXETX__(text);
    text = text.replace(all, function(match, text) {
        //console.log(match);
        var key  = self.hashBlock(text);
        return "\n\n" + key + "\n\n";
    });
    text = this.__unwrapSTXETX__(text);
    return text;
};

/**
 * Called whenever a tag must be hashed when a function insert an atomic 
 * element in the text stream. Passing $text to through this function gives
 * a unique text-token which will be reverted back when calling unhash.
 *
 * The boundary argument specify what character should be used to surround
 * the token. By convension, "B" is used for block elements that needs not
 * to be wrapped into paragraph tags at the end, ":" is used for elements
 * that are word separators and "X" is used in the general case.
 */
Markdown_Parser.prototype.hashPart = function(text, boundary) {
    if('undefined' === typeof boundary) {
        boundary = 'X';
    }
    // Swap back any tag hash found in text so we do not have to `unhash`
    // multiple times at the end.
    text = this.unhash(text);

    // Then hash the block.
    if('undefined' === typeof arguments.callee.i) {
        arguments.callee.i = 0;
    }
    var key = boundary + "\x1A" + (++arguments.callee.i) + boundary;
    this.html_hashes[key] = text;
    return key; // String that will replace the tag.
};

/**
 * Shortcut function for hashPart with block-level boundaries.
 */
Markdown_Parser.prototype.hashBlock = function(text) {
    return this.hashPart(text, 'B');
};

/**
 * Strips link definitions from text, stores the URLs and titles in
 * hash references.
 */
Markdown_Parser.prototype.stripLinkDefinitions = function(text) {
    var less_than_tab = this.tab_width - 1;
    var self = this;
    // Link defs are in the form: ^[id]: url "optional title"
    text = this.__wrapSTXETX__(text);
    text = text.replace(new RegExp(
        '^[ ]{0,' + less_than_tab + '}\\[(.+)\\][ ]?:' + // id = $1
            '[ ]*'        +
                '\\n?'    + // maybe *one* newline
                '[ ]*'    +
            '(?:'         +
                '<(.+?)>' + // url = $2
            '|'           +
                '(\\S+?)' + // url = $3
            ')'           +
            '[ ]*'        +
            '\\n?'        + // maybe one newline
            '[ ]*'        +
            '(?:'         +
                //'(?=\\s)' + // lookbehind for whitespace
                '["\\(]'  +
                '(.*?)'   + // title = $4
                '["\\)]'  +
                '[ ]*'    +
            ')?'          + // title is optional
            '(?:\\n+|\\n*(?=\\x03))',
        'mg'), function(match, id, url2, url3, title) {
            //console.log(match);
            var link_id = id.toLowerCase();
            var url = url2 ? url2 : url3;
            self.urls[link_id] = url;
            self.titles[link_id] = title;
            return ''; // String that will replace the block
        }
    );
    text = this.__unwrapSTXETX__(text);
    return text;
};

/**
 * Run block gamut tranformations.
 */
Markdown_Parser.prototype.runBlockGamut = function(text) {
    // We need to escape raw HTML in Markdown source before doing anything 
    // else. This need to be done for each block, and not only at the 
    // begining in the Markdown function since hashed blocks can be part of
    // list items and could have been indented. Indented blocks would have 
    // been seen as a code block in a previous pass of hashHTMLBlocks.
    text = this.hashHTMLBlocks(text);
    return this.runBasicBlockGamut(text);
};

/**
 * Run block gamut tranformations, without hashing HTML blocks. This is 
 * useful when HTML blocks are known to be already hashed, like in the first
 * whole-document pass.
 */
Markdown_Parser.prototype.runBasicBlockGamut = function(text) {
    for(var i = 0; i < this.block_gamut.length; i++) {
        var method = this[this.block_gamut[i][0]];
        if(method) {
            text = method.call(this, text);
        }
        else {
            console.log(this.block_gamut[i][0] + ' not implemented');
        }
    }
    // Finally form paragraph and restore hashed blocks.
    text = this.formParagraphs(text);
    return text;
};

/**
 * Do Horizontal Rules:
 */
Markdown_Parser.prototype.doHorizontalRules = function(text) {
    var self = this;
    return text.replace(new RegExp(
        '^[ ]{0,3}'    + // Leading space
        '([-\\*_])'    + // $1: First marker
        '(?:'          + // Repeated marker group
            '[ ]{0,2}' + // Zero, one, or two spaces.
            '\\1'      + // Marker character
        '){2,}'        + // Group repeated at least twice
        '[ ]*'         + //Tailing spaces
        '$'            , // End of line.
    'mg'), function(match) {
        //console.log(match);
        return "\n" + self.hashBlock("<hr" + self.empty_element_suffix) + "\n";
    });
};

/**
 * Run span gamut tranformations.
 */
Markdown_Parser.prototype.runSpanGamut = function(text) {
    for(var i = 0; i < this.span_gamut.length; i++) {
        var method = this[this.span_gamut[i][0]];
        if(method) {
            text = method.call(this, text);
        }
        else {
            console.log(this.span_gamut[i][0] + ' not implemented');
        }
    }
    return text;
};

/**
 * Do hard breaks:
 */
Markdown_Parser.prototype.doHardBreaks = function(text) {
    var self = this;
    return text.replace(/ {2,}\n/mg, function(match) {
        //console.log(match);
        return self.hashPart("<br" + self.empty_element_suffix + "\n");
    });
};


/**
 * Turn Markdown link shortcuts into XHTML <a> tags.
 */
Markdown_Parser.prototype.doAnchors = function(text) {
    if (this.in_anchor) return text;
    this.in_anchor = true;

    var self = this;

    var _doAnchors_reference_callback = function(match, whole_match, link_text, link_id) {
        //console.log(match);
        if(typeof(link_id) !== 'string' || link_id === '') {
            // for shortcut links like [this][] or [this].
            link_id = link_text;
        }

        // lower-case and turn embedded newlines into spaces
        link_id = link_id.toLowerCase();
        link_id = link_id.replace(/[ ]?\n/, ' ');

        var result;
        if ('undefined' !== typeof self.urls[link_id]) {
            var url = self.urls[link_id];
            url = self.encodeAttribute(url);

            result = "<a href=\"" + url + "\"";
            if ('undefined' !== typeof self.titles[link_id]) {
                var title = self.titles[link_id];
                title = self.encodeAttribute(title);
                result +=  " title=\"" + title + "\"";
            }

            link_text = self.runSpanGamut(link_text);
            result += ">" + link_text + "</a>";
            result = self.hashPart(result);
        }
        else {
            result = whole_match;
        }
        return result;
    };

    //
    // First, handle reference-style links: [link text] [id]
    //
    text = text.replace(new RegExp(
        '('               + // wrap whole match in $1
          '\\['           +
            '(' + this.nested_brackets_re + ')' +  // link text = $2
          '\\]'           +

          '[ ]?'          + // one optional space
          '(?:\\n[ ]*)?'  + // one optional newline followed by spaces

          '\\['           +
            '(.*?)'       + // id = $3
          '\\]'           +
        ')',
        'mg'
    ), _doAnchors_reference_callback);

    //
    // Next, inline-style links: [link text](url "optional title")
    //
    text = text.replace(new RegExp(
        '('               + // wrap whole match in $1
          '\\['           +
            '(' + this.nested_brackets_re + ')' + // link text = $2
          '\\]'           +
          '\\('           + // literal paren
            '[ \\n]*'     +
            '(?:'         +
                '<(.+?)>' + // href = $3
            '|'           +
                '(' + this.nested_url_parenthesis_re + ')' + // href = $4
            ')'           +
            '[ \\n]*'     +
            '('           + // $5
              '([\'"])'   + // quote char = $6
              '(.*?)'     + // Title = $7
              '\\6'       + // matching quote
              '[ \\n]*'   + // ignore any spaces/tabs between closing quote and )
            ')?'          + // title is optional
          '\\)'           +
        ')',
        'mg'
    ), function(match, whole_match, link_text, url3, url4, x0, x1, title) {
        //console.log(match);
        link_text = self.runSpanGamut(link_text);
        var url = url3 ? url3 : url4;

        url = self.encodeAttribute(url);

        var result = "<a href=\"" + url + "\"";
        if ('undefined' !== typeof title && title !== '') {
            title = self.encodeAttribute(title);
            result +=  " title=\"" + title + "\"";
        }

        link_text = self.runSpanGamut(link_text);
        result += ">" + link_text + "</a>";

        return self.hashPart(result);
    });

    //
    // Last, handle reference-style shortcuts: [link text]
    // These must come last in case you've also got [link text][1]
    // or [link text](/foo)
    //
    text = text.replace(new RegExp(
        '('                  + // wrap whole match in $1
          '\\['              +
              '([^\\[\\]]+)' + // link text = $2; can\'t contain [ or ]
          '\\]'              +
        ')',
        'mg'
    ), _doAnchors_reference_callback);

    this.in_anchor = false;
    return text;
};

/**
 * Turn Markdown image shortcuts into <img> tags.
 */
Markdown_Parser.prototype.doImages = function(text) {
    var self = this;

    //
    // First, handle reference-style labeled images: ![alt text][id]
    //
    text = text.replace(new RegExp(
        '('              + // wrap whole match in $1
          '!\\['         +
            '(' + this.nested_brackets_re + ')' + // alt text = $2
          '\\]'          +

          '[ ]?'         + // one optional space
          '(?:\\n[ ]*)?' + // one optional newline followed by spaces

          '\\['          +
            '(.*?)'      + // id = $3
          '\\]'          +

        ')',
        'mg'
    ), function(match, whole_match, alt_text, link_id) {
        //console.log(match);
        link_id = link_id.toLowerCase();

        if (typeof(link_id) !== 'string' || link_id === '') {
            link_id = alt_text.toLowerCase(); // for shortcut links like ![this][].
        }

        alt_text = self.encodeAttribute(alt_text);
        var result;
        if ('undefined' !== typeof self.urls[link_id]) {
            var url = self.encodeAttribute(self.urls[link_id]);
            result = "<img src=\"" + url + "\" alt=\"" + alt_text + "\"";
            if ('undefined' !== typeof self.titles[link_id]) {
                var title = self.titles[link_id];
                title = self.encodeAttribute(title);
                result +=  " title=\"" + title + "\"";
            }
            result += self.empty_element_suffix;
            result = self.hashPart(result);
        }
        else {
            // If there's no such link ID, leave intact:
            result = whole_match;
        }

        return result;
    });

    //
    // Next, handle inline images:  ![alt text](url "optional title")
    // Don't forget: encode * and _
    //
    text = text.replace(new RegExp(
        '('                + // wrap whole match in $1
          '!\\['           +
            '(' + this.nested_brackets_re + ')' +		// alt text = $2
          '\\]'            +
          '\\s?'           + // One optional whitespace character
          '\\('            + // literal paren
            '[ \\n]*'      +
            '(?:'          +
                '<(\\S*)>' + // src url = $3
            '|'            +
                '(' + this.nested_url_parenthesis_re + ')' +	// src url = $4
            ')'            +
            '[ \\n]*'      +
            '('            + // $5
              '([\'"])'    + // quote char = $6
              '(.*?)'      + // title = $7
              '\\6'        + // matching quote
              '[ \\n]*'    +
            ')?'           + // title is optional
          '\\)'            +
        ')',
        'mg'
    ), function(match, whole_match, alt_text, url3, url4, x5, x6, title) {
        //console.log(match);
        var url = url3 ? url3 : url4;

        alt_text = self.encodeAttribute(alt_text);
        url = self.encodeAttribute(url);
        var result = "<img src=\"" + url + "\" alt=\"" + alt_text + "\"";
        if ('undefined' !== typeof title && title !== '') {
            title = self.encodeAttribute(title);
            result +=  " title=\"" + title + "\""; // $title already quoted
        }
        result += self.empty_element_suffix;

        return self.hashPart(result);
    });

    return text;
};

Markdown_Parser.prototype.doHeaders = function(text) {
    var self = this;
    // Setext-style headers:
    //    Header 1
    //    ========
    //
    //    Header 2
    //    --------
    //
    text = text.replace(/^(.+?)[ ]*\n(=+|-+)[ ]*\n+/mg, function(match, span, line) {
       //console.log(match);
       // Terrible hack to check we haven't found an empty list item.
        if(line == '-' && span.match(/^-(?: |$)/)) {
            return match;
        }
        var level = line.charAt(0) == '=' ? 1 : 2;
        var block = "<h" + level + ">" + self.runSpanGamut(span) + "</h" + level + ">";
        return "\n" + self.hashBlock(block)  + "\n\n";
    });

    // atx-style headers:
    //  # Header 1
    //  ## Header 2
    //  ## Header 2 with closing hashes ##
    //  ...
    //  ###### Header 6
    //
    text = text.replace(new RegExp(
        '^(\\#{1,6})' + // $1 = string of #\'s
        '[ ]*'        +
        '(.+?)'       + // $2 = Header text
        '[ ]*'        +
        '\\#*'        + // optional closing #\'s (not counted)
        '\\n+',
        'mg'
    ), function(match, hashes, span) {
        //console.log(match);
        var level = hashes.length;
        var block = "<h" + level + ">" + self.runSpanGamut(span) + "</h" + level + ">";
        return "\n" + self.hashBlock(block) + "\n\n";
    });

    return text;
};

/**
 * Form HTML ordered (numbered) and unordered (bulleted) lists.
 */
Markdown_Parser.prototype.doLists = function(text) {
    var less_than_tab = this.tab_width - 1;

    // Re-usable patterns to match list item bullets and number markers:
    var marker_ul_re  = '[\\*\\+-]';
    var marker_ol_re  = '\\d+[\\.]';
    var marker_any_re = "(?:" + marker_ul_re + "|" + marker_ol_re + ")";

    var self = this;
    var _doLists_callback = function(match, list, x2, x3, type) {
        //console.log(match);
        // Re-usable patterns to match list item bullets and number markers:
        var list_type = type.match(marker_ul_re) ? "ul" : "ol";

        var marker_any_re = list_type == "ul" ? marker_ul_re : marker_ol_re;

        list += "\n";
        var result = self.processListItems(list, marker_any_re);

        result = self.hashBlock("<" + list_type + ">\n" + result + "</" + list_type + ">");
        return "\n" + result + "\n\n";
    };

    var markers_relist = [
        [marker_ul_re, marker_ol_re],
        [marker_ol_re, marker_ul_re]
    ];

    for (var i = 0; i < markers_relist.length; i++) {
        var marker_re = markers_relist[i][0];
        var other_marker_re = markers_relist[i][1];
        // Re-usable pattern to match any entirel ul or ol list:
        var whole_list_re =
            '('               + // $1 = whole list
              '('             + // $2
                '([ ]{0,' + less_than_tab + '})' + // $3 = number of spaces
                '(' + marker_re + ')'            + // $4 = first list item marker
                '[ ]+'        +
              ')'             +
              '[\\s\\S]+?'    +
              '('             + // $5
                  '(?=\\x03)' +  // \z
                '|'           +
                  '\\n{2,}'   +
                  '(?=\\S)'   +
                  '(?!'       + // Negative lookahead for another list item marker
                    '[ ]*'    +
                    marker_re + '[ ]+' +
                  ')'         +
                '|'           +
                  '(?='       + // Lookahead for another kind of list
                    '\\n'     +
                    '\\3'     + // Must have the same indentation
                    other_marker_re + '[ ]+' +
                  ')'         +
              ')'             +
            ')'; // mx

        // We use a different prefix before nested lists than top-level lists.
        // See extended comment in _ProcessListItems().

        text = this.__wrapSTXETX__(text);
        if (this.list_level) {
            text = text.replace(new RegExp('^' + whole_list_re, "mg"), _doLists_callback);
        }
        else {
            text = text.replace(new RegExp(
                '(?:(?=\\n)\\n|\\x02\\n?)' + // Must eat the newline
                whole_list_re, "mg"
            ), _doLists_callback);
        }
        text = this.__unwrapSTXETX__(text);
    }

    return text;
};

// var $list_level = 0;

/**
 * Process the contents of a single ordered or unordered list, splitting it
 * into individual list items.
 */
Markdown_Parser.prototype.processListItems = function(list_str, marker_any_re) {
    // The $this->list_level global keeps track of when we're inside a list.
    // Each time we enter a list, we increment it; when we leave a list,
    // we decrement. If it's zero, we're not in a list anymore.
    //
    // We do this because when we're not inside a list, we want to treat
    // something like this:
    //
    //    I recommend upgrading to version
    //    8. Oops, now this line is treated
    //    as a sub-list.
    //
    // As a single paragraph, despite the fact that the second line starts
    // with a digit-period-space sequence.
    //
    // Whereas when we're inside a list (or sub-list), that line will be
    // treated as the start of a sub-list. What a kludge, huh? This is
    // an aspect of Markdown's syntax that's hard to parse perfectly
    // without resorting to mind-reading. Perhaps the solution is to
    // change the syntax rules such that sub-lists must start with a
    // starting cardinal number; e.g. "1." or "a.".

    if('undefined' === typeof this.list_level) {
        this.list_level = 0;
    }
    this.list_level++;

    // trim trailing blank lines:
    list_str = this.__wrapSTXETX__(list_str);
    list_str = list_str.replace(/\n{2,}(?=\x03)/m, "\n");
    list_str = this.__unwrapSTXETX__(list_str);

    var self = this;
    list_str = this.__wrapSTXETX__(list_str);
    list_str = list_str.replace(new RegExp(
        '(\\n)?'                + // leading line = $1
        '([ ]*)'                + // leading whitespace = $2
        '(' + marker_any_re     + // list marker and space = $3
            '(?:[ ]+|(?=\\n))'  + // space only required if item is not empty
        ')'                     +
        '([\\s\\S]*?)'          + // list item text   = $4
        '(?:(\\n+(?=\\n))|\\n)' + // tailing blank line = $5
        '(?=\\n*(\\x03|\\2(' + marker_any_re + ')(?:[ ]+|(?=\\n))))',
        "gm"
    ), function(match, leading_line, leading_space, marker_space, item, tailing_blank_line) {
        //console.log(match);
        //console.log(item, [leading_line ? leading_line.length : 0, tailing_blank_line ? tailing_blank_line.length : 0]);
        if (leading_line || tailing_blank_line || item.match(/\n{2,}/)) {
            // Replace marker with the appropriate whitespace indentation
            item = leading_space + self._php_str_repeat(' ', marker_space.length) + item;
            item = self.runBlockGamut(self.outdent(item) + "\n");
        }
        else {
            // Recursion for sub-lists:
            item = self.doLists(self.outdent(item));
            item = item.replace(/\n+$/m, '');
            item = self.runSpanGamut(item);
        }

        return "<li>" + item + "</li>\n";
    });
    list_str = this.__unwrapSTXETX__(list_str);

    this.list_level--;
    return list_str;
};

/**
 *   Process Markdown `<pre><code>` blocks.
 */
Markdown_Parser.prototype.doCodeBlocks = function(text) {
    var self = this;
    text = this.__wrapSTXETX__(text);
    text = text.replace(new RegExp(
        '(?:\\n\\n|(?=\\x02)\\n?)' +
        '('                        + // $1 = the code block -- one or more lines, starting with a space/tab
          '(?:^'                   +
            '[ ]{' + this.tab_width + ',}' +  // Lines must start with a tab or a tab-width of spaces
            '.*\\n+'               +
          ')+'                     +
        ')'                        +
        '((?=[ ]{0,' + this.tab_width + '}\\S)|(?:\\n*(?=\\x03)))',  // Lookahead for non-space at line-start, or end of doc
        'mg'
    ), function(match, codeblock) {
        //console.log(match);
        codeblock = self.outdent(codeblock);
        codeblock = self._php_htmlspecialchars_ENT_NOQUOTES(codeblock);

        // trim leading newlines and trailing newlines
        codeblock = self.__wrapSTXETX__(codeblock);
        codeblock = codeblock.replace(/(?=\x02)\n+|\n+(?=\x03)/g, '');
        codeblock = self.__unwrapSTXETX__(codeblock);

        codeblock = "<pre><code>" + codeblock + "\n</code></pre>";
        return "\n\n" + self.hashBlock(codeblock) + "\n\n";
    });
    text = this.__unwrapSTXETX__(text);
    return text;
};

/**
 * Create a code span markup for $code. Called from handleSpanToken.
 */
Markdown_Parser.prototype.makeCodeSpan = function(code) {
    code = this._php_htmlspecialchars_ENT_NOQUOTES(this._php_trim(code));
    return this.hashPart("<code>" + code + "</code>");
};

/**
 * Prepare regular expressions for searching emphasis tokens in any
 * context.
 */
Markdown_Parser.prototype.prepareItalicsAndBold = function() {
    this.em_strong_prepared_relist = {};
    for(var i = 0; i < this.em_relist.length; i++) {
        var em = this.em_relist[i][0];
        var em_re = this.em_relist[i][1];
        for(var j = 0; j < this.strong_relist.length; j++) {
            var strong = this.strong_relist[j][0];
            var strong_re = this.strong_relist[j][1];
            // Construct list of allowed token expressions.
            var token_relist = [];
            for(var k = 0; k < this.em_strong_relist.length; k++) {
                var em_strong = this.em_strong_relist[k][0];
                var em_strong_re = this.em_strong_relist[k][1];
                if(em + strong == em_strong) {
                    token_relist.push(em_strong_re);
                }
            }
            token_relist.push(em_re);
            token_relist.push(strong_re);

            // Construct master expression from list.
            var token_re = new RegExp('(' + token_relist.join('|')  + ')');
            this.em_strong_prepared_relist['rx_' + em + strong] = token_re;
        }
    }
};

Markdown_Parser.prototype.doItalicsAndBold = function(text) {
    var em = '';
    var strong = '';
    var tree_char_em = false;
    var text_stack = [''];
    var token_stack = [];
    var token = '';

    while (1) {
        //
        // Get prepared regular expression for seraching emphasis tokens
        // in current context.
        //
        var token_re = this.em_strong_prepared_relist['rx_' + em + strong];

        //
        // Each loop iteration search for the next emphasis token. 
        // Each token is then passed to handleSpanToken.
        //
        var parts = text.match(token_re); //PREG_SPLIT_DELIM_CAPTURE
        if(parts) {
            var left = RegExp.leftContext;
            var right = RegExp.rightContext;
            var pre = "";
            var marker = parts[1];
            for(var mg = 2; mg < parts.length; mg += 2) {
                if('undefined' !== typeof parts[mg]) {
                    pre = parts[mg];
                    marker = parts[mg + 1];
                    break;
                }
            }
            //console.log([left + pre, marker]);
            text_stack[0] += (left + pre);
            token = marker;
            text = right;
        }
        else {
            text_stack[0] += text;
            token = '';
            text = '';
        }
        if(token == '') {
            // Reached end of text span: empty stack without emitting.
            // any more emphasis.
            while (token_stack.length > 0 && token_stack[0].length > 0) {
                text_stack[1] += token_stack.shift();
                var text_stack_prev0 = text_stack.shift(); // $text_stack[0] .= array_shift($text_stack);
                text_stack[0] += text_stack_prev0;
            }
            break;
        }

        var tag, span;

        var token_len = token.length;
        if (tree_char_em) {
            // Reached closing marker while inside a three-char emphasis.
            if (token_len == 3) {
                // Three-char closing marker, close em and strong.
                token_stack.shift();
                span = text_stack.shift();
                span = this.runSpanGamut(span);
                span = "<strong><em>" + span + "</em></strong>";
                text_stack[0] += this.hashPart(span);
                em = '';
                strong = '';
            } else {
                // Other closing marker: close one em or strong and
                // change current token state to match the other
                token_stack[0] = this._php_str_repeat(token.charAt(0), 3 - token_len);
                tag = token_len == 2 ? "strong" : "em";
                span = text_stack[0];
                span = this.runSpanGamut(span);
                span = "<" + tag + ">" + span + "</" + tag + ">";
                text_stack[0] = this.hashPart(span);
                if(tag == 'strong') { strong = ''; } else { em = ''; }
            }
            tree_char_em = false;
        } else if (token_len == 3) {
            if (em != '') {
                // Reached closing marker for both em and strong.
                // Closing strong marker:
                for (var i = 0; i < 2; ++i) {
                    var shifted_token = token_stack.shift();
                    tag = shifted_token.length == 2 ? "strong" : "em";
                    span = text_stack.shift();
                    span = this.runSpanGamut(span);
                    span = "<" + tag + ">" + span + "</" + tag + ">";
                    text_stack[0] = this.hashPart(span);
                    if(tag == 'strong') { strong = ''; } else { em = ''; }
                }
            } else {
                // Reached opening three-char emphasis marker. Push on token 
                // stack; will be handled by the special condition above.
                em = token.charAt(0);
                strong = em + em;
                token_stack.unshift(token);
                text_stack.unshift('');
                tree_char_em = true;
            }
        } else if (token_len == 2) {
            if (strong != '') {
                // Unwind any dangling emphasis marker:
                if (token_stack[0].length == 1) {
                    text_stack[1] += token_stack.shift();
                    text_stack[0] += text_stack.shift();
                }
                // Closing strong marker:
                token_stack.shift();
                span = text_stack.shift();
                span = this.runSpanGamut(span);
                span = "<strong>" + span + "</strong>";
                text_stack[0] += this.hashPart(span);
                strong = '';
            } else {
                token_stack.unshift(token);
                text_stack.unshift('');
                strong = token;
            }
        } else {
            // Here $token_len == 1
            if (em != '') {
                if (token_stack[0].length == 1) {
                    // Closing emphasis marker:
                    token_stack.shift();
                    span = text_stack.shift();
                    span = this.runSpanGamut(span);
                    span = "<em>" + span + "</em>";
                    text_stack[0] += this.hashPart(span);
                    em = '';
                } else {
                    text_stack[0] += token;
                }
            } else {
                token_stack.unshift(token);
                text_stack.unshift('');
                em = token;
            }
        }
    }
    return text_stack[0];
};


Markdown_Parser.prototype.doBlockQuotes = function(text) {
    var self = this;
    text = text.replace(new RegExp(
        '('              + // Wrap whole match in $1
          '(?:'          +
            '^[ ]*>[ ]?' + // ">" at the start of a line
              '.+\\n'    + // rest of the first line
            '(.+\\n)*'   + // subsequent consecutive lines
            '\\n*'       + // blanks
          ')+'           +
        ')',
        'mg'
    ), function(match, bq) {
        //console.log(match);
        // trim one level of quoting - trim whitespace-only lines
        bq = bq.replace(/^[ ]*>[ ]?|^[ ]+$/mg, '');
        bq = self.runBlockGamut(bq);		// recurse

        bq = bq.replace(/^/mg, "  ");
        // These leading spaces cause problem with <pre> content, 
        // so we need to fix that:
        bq = bq.replace(/(\\s*<pre>[\\s\\S]+?<\/pre>)/mg, function(match, pre) {
            //console.log(match);
            pre = pre.replace(/^  /m, '');
            return pre;
        });

        return "\n" + self.hashBlock("<blockquote>\n" + bq + "\n</blockquote>") + "\n\n";
    });
    return text;
};

/**
 * Params:
 * $text - string to process with html <p> tags
 */
Markdown_Parser.prototype.formParagraphs = function(text) {

    // Strip leading and trailing lines:
    text = this.__wrapSTXETX__(text);
    text = text.replace(/(?:\x02)\n+|\n+(?:\x03)/g, "");
    text = this.__unwrapSTXETX__(text);
    // [porting note]
    // below may be faster than js regexp.
    //for(var s = 0; s < text.length && text.charAt(s) == "\n"; s++) { }
    //text = text.substr(s);
    //for(var e = text.length; e > 0 && text.charAt(e - 1) == "\n"; e--) { }
    //text = text.substr(0, e);

    var grafs = text.split(/\n{2,}/m);
    //preg_split('/\n{2,}/', $text, -1, PREG_SPLIT_NO_EMPTY);

    //
    // Wrap <p> tags and unhashify HTML blocks
    //
    for(var i = 0; i < grafs.length; i++) {
        var value = grafs[i];
        if(value == "") {
            // [porting note]
            // This case is replacement for PREG_SPLIT_NO_EMPTY.
        }
        else if (!value.match(/^B\x1A[0-9]+B$/)) {
            // Is a paragraph.
            value = this.runSpanGamut(value);
            value = value.replace(/^([ ]*)/, "<p>");
            value += "</p>";
            grafs[i] = this.unhash(value);
        }
        else {
            // Is a block.
            // Modify elements of @grafs in-place...
            var graf = value;
            var block = this.html_hashes[graf];
            graf = block;
            //if (preg_match('{
            //	\A
            //	(							# $1 = <div> tag
            //	  <div  \s+
            //	  [^>]*
            //	  \b
            //	  markdown\s*=\s*  ([\'"])	#	$2 = attr quote char
            //	  1
            //	  \2
            //	  [^>]*
            //	  >
            //	)
            //	(							# $3 = contents
            //	.*
            //	)
            //	(</div>)					# $4 = closing tag
            //	\z
            //	}xs', $block, $matches))
            //{
            //	list(, $div_open, , $div_content, $div_close) = $matches;
            //
            //	# We can't call Markdown(), because that resets the hash;
            //	# that initialization code should be pulled into its own sub, though.
            //	$div_content = $this->hashHTMLBlocks($div_content);
            //	
            //	# Run document gamut methods on the content.
            //	foreach ($this->document_gamut as $method => $priority) {
            //		$div_content = $this->$method($div_content);
            //	}
            //
            //	$div_open = preg_replace(
            //		'{\smarkdown\s*=\s*([\'"]).+?\1}', '', $div_open);
            //
            //	$graf = $div_open . "\n" . $div_content . "\n" . $div_close;
            //}
            grafs[i] = graf;
        }
    }

    return grafs.join("\n\n");
};

/**
 * Encode text for a double-quoted HTML attribute. This function
 * is *not* suitable for attributes enclosed in single quotes.
 */
Markdown_Parser.prototype.encodeAttribute = function(text) {
    text = this.encodeAmpsAndAngles(text);
    text = text.replace(/"/g, '&quot;');
    return text;
};

/**
 * Smart processing for ampersands and angle brackets that need to 
 * be encoded. Valid character entities are left alone unless the
 * no-entities mode is set.
 */
Markdown_Parser.prototype.encodeAmpsAndAngles = function(text) {
    if (this.no_entities) {
        text = text.replace(/&/g, '&amp;');
    } else {
        // Ampersand-encoding based entirely on Nat Irons's Amputator
        // MT plugin: <http://bumppo.net/projects/amputator/>
        text = text.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/, '&amp;');
    }
    // Encode remaining <'s
    text = text.replace(/</g, '&lt;');

    return text;
};

Markdown_Parser.prototype.doAutoLinks = function(text) {
    var self = this;
    text = text.replace(/<((https?|ftp|dict):[^'">\s]+)>/i, function(match, address) {
        //console.log(match);
        var url = self.encodeAttribute(address);
        var link = "<a href=\"" + url + "\">" + url + "</a>";
        return self.hashPart(link);
    });

    // Email addresses: <address@domain.foo>
    text = text.replace(new RegExp(
        '<'                            +
        '(?:mailto:)?'                 +
        '('                            +
            '(?:'                      +
                '[-!#$%&\'*+/=?^_`.{|}~\\w\\x80-\\xFF]+' +
            '|'                        +
                '".*?"'                +
            ')'                        +
            '\\@'                      +
            '(?:'                      +
                '[-a-z0-9\\x80-\\xFF]+(\\.[-a-z0-9\\x80-\\xFF]+)*\\.[a-z]+' +
            '|'                        +
                '\\[[\\d.a-fA-F:]+\\]' +  // IPv4 & IPv6
            ')'                        +
        ')'                            +
        '>',
        'i'
    ), function(match, address) {
        //console.log(match);
        var link = self.encodeEmailAddress(address);
        return self.hashPart(link);
    });

    return text;
};

/**
 *  Input: an email address, e.g. "foo@example.com"
 *
 *  Output: the email address as a mailto link, with each character
 *      of the address encoded as either a decimal or hex entity, in
 *      the hopes of foiling most address harvesting spam bots. E.g.:
 *
 *    <p><a href="&#109;&#x61;&#105;&#x6c;&#116;&#x6f;&#58;&#x66;o&#111;
 *        &#x40;&#101;&#x78;&#97;&#x6d;&#112;&#x6c;&#101;&#46;&#x63;&#111;
 *        &#x6d;">&#x66;o&#111;&#x40;&#101;&#x78;&#97;&#x6d;&#112;&#x6c;
 *        &#101;&#46;&#x63;&#111;&#x6d;</a></p>
 *
 *   Based by a filter by Matthew Wickline, posted to BBEdit-Talk.
 *   With some optimizations by Milian Wolff.
 */
Markdown_Parser.prototype.encodeEmailAddress = function(addr) {
    if('undefined' === typeof arguments.callee.crctable) {
        arguments.callee.crctable =
            "00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 " +
            "0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 " +
            "1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 " +
            "136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 " +
            "3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B " +
            "35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 " +
            "26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F " +
            "2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D " +
            "76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 " +
            "7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 " +
            "6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 " +
            "65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 " +
            "4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB " +
            "4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 " +
            "5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F " +
            "5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD " +
            "EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 " +
            "E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 " +
            "F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 " +
            "FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 " +
            "D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B " +
            "D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 " +
            "CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F " +
            "C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D " +
            "9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 " +
            "95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 " +
            "86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 " +
            "88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 " +
            "A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB " +
            "AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 " +
            "BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF " +
            "B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D".split(' ');
    }
    var crctable = arguments.callee.crctable;
    function _crc32(str) {
        var crc = 0;
        crc = crc ^ (-1);
        for (var i = 0; i < str.length; ++i) {
            var y = (crc ^ str.charCodeAt(i)) & 0xff;
            var x = "0x" + crctable[y];
            crc = (crc >>> 8) ^ x;
        }
        return (crc ^ (-1)) >>> 0;
    }

    addr = "mailto:" + addr;
    var chars = [];
    var i;
    for(i = 0; i < addr.length; i++) {
        chars.push(addr.charAt(i));
    }
    var seed = Math.floor(Math.abs(_crc32(addr) / addr.length)); // # Deterministic seed.

    for(i = 0; i < chars.length; i++) {
        var c = chars[i];
        var ord = c.charCodeAt(0);
        // Ignore non-ascii chars.
        if(ord < 128) {
            var r = (seed * (1 + i)) % 100; // Pseudo-random function.
            // roughly 10% raw, 45% hex, 45% dec
            // '@' *must* be encoded. I insist.
            if(r > 90 && c != '@') { /* do nothing */ }
            else if(r < 45) { chars[i] = '&#x' + ord.toString(16) + ';'; }
            else            { chars[i] = '&#' + ord.toString(10) + ';'; }
        }
    }

    addr = chars.join('');
    var text = chars.splice(7).join(''); // text without `mailto:`
    addr = "<a href=\"" + addr + "\">" + text + "</a>";

    return addr;
};

/**
 * Take the string $str and parse it into tokens, hashing embeded HTML,
 * escaped characters and handling code spans.
*/
Markdown_Parser.prototype.parseSpan = function(str) {
    var output = '';

    var span_re = new RegExp(
            '('                          +
                '\\\\' + this.escape_chars_re +
            '|'                          +
                // This expression is too difficult for JS: '(?<![`\\\\])'
                // Resoled by hand coded process.
                '`+'                     + // code span marker
        (this.no_markup ? '' : (
            '|'                          +
                '<!--.*?-->'             + // comment
            '|'                          +
                '<\\?.*?\\?>|<%.*?%>'    + // processing instruction
            '|'                          +
                '<[/!$]?[-a-zA-Z0-9:_]+' + // regular tags
                '(?='                    +
                    '\\s'                +
                    '(?=[^"\'>]+|"[^"]*"|\'[^\']*\')*' +
                ')?'                     +
                '>'
        )) +
            ')'
    );

    while(1) {
        //
        // Each loop iteration seach for either the next tag, the next 
        // openning code span marker, or the next escaped character. 
        // Each token is then passed to handleSpanToken.
        //
        var parts = str.match(span_re); //PREG_SPLIT_DELIM_CAPTURE
        if(parts) {
            if(RegExp.leftContext) {
                output += RegExp.leftContext;
            }
            // Back quote but after backslash is to be ignored.
            if(RegExp.lastMatch.charAt(0) == "`" &&
               RegExp.leftContext.charAt(RegExp.leftContext.length - 1) == "\\"
            ) {
                output += RegExp.lastMatch;
                str = RegExp.rightContext;
                continue;
            }
            var r = this.handleSpanToken(RegExp.lastMatch, RegExp.rightContext);
            output += r[0];
            str = r[1];
        }
        else {
            output += str;
            break;
        }
    }
    return output;
};


/**
 * Handle $token provided by parseSpan by determining its nature and 
 * returning the corresponding value that should replace it.
*/
Markdown_Parser.prototype.handleSpanToken = function(token, str) {
    //console.log([token, str]);
    switch (token.charAt(0)) {
        case "\\":
            return [this.hashPart("&#" + token.charCodeAt(1) + ";"), str];
        case "`":
            // Search for end marker in remaining text.
            if (str.match(new RegExp('^([\\s\\S]*?[^`])' + this._php_preg_quote(token) + '(?!`)([\\s\\S]*)$', 'm'))) {
                var code = RegExp.$1;
                str = RegExp.$2;
                var codespan = this.makeCodeSpan(code);
                return [this.hashPart(codespan), str];
            }
            return [token, str]; // return as text since no ending marker found.
        default:
            return [this.hashPart(token), str];
    }
};

/**
 * Remove one level of line-leading tabs or spaces
 */
Markdown_Parser.prototype.outdent = function(text) {
    return text.replace(new RegExp('^(\\t|[ ]{1,' + this.tab_width + '})', 'mg'), '');
};


//# String length function for detab. `_initDetab` will create a function to 
//# hanlde UTF-8 if the default function does not exist.
//var $utf8_strlen = 'mb_strlen';

/**
 * Replace tabs with the appropriate amount of space.
 */
Markdown_Parser.prototype.detab = function(text) {
    // For each line we separate the line in blocks delemited by
    // tab characters. Then we reconstruct every line by adding the 
    // appropriate number of space between each blocks.
    var self = this;
    return text.replace(/^.*\t.*$/mg, function(line) {
        //$strlen = $this->utf8_strlen; # strlen function for UTF-8.
        // Split in blocks.
        var blocks = line.split("\t");
        // Add each blocks to the line.
        line = blocks.shift(); // Do not add first block twice.
        for(var i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            // Calculate amount of space, insert spaces, insert block.
            var amount = self.tab_width - line.length % self.tab_width;
            line += self._php_str_repeat(" ", amount) + block;
        }
        return line;
    });
};

/**
 * Swap back in all the tags hashed by _HashHTMLBlocks.
 */
Markdown_Parser.prototype.unhash = function(text) {
    var self = this;
    return text.replace(/(.)\x1A[0-9]+\1/g, function(match) {
        return self.html_hashes[match];
    });
};
/*-------------------------------------------------------------------------*/

/**
 * Constructor function. Initialize the parser object.
 */
function MarkdownExtra_Parser() {

    // Prefix for footnote ids.
    this.fn_id_prefix = "";

    // Optional title attribute for footnote links and backlinks.
    this.fn_link_title = MARKDOWN_FN_LINK_TITLE;
    this.fn_backlink_title = MARKDOWN_FN_BACKLINK_TITLE;

    // Optional class attribute for footnote links and backlinks.
    this.fn_link_class = MARKDOWN_FN_LINK_CLASS;
    this.fn_backlink_class = MARKDOWN_FN_BACKLINK_CLASS;

    // Predefined abbreviations.
    this.predef_abbr = {};

    // Extra variables used during extra transformations.
    this.footnotes = {};
    this.footnotes_ordered = [];
    this.abbr_desciptions = {};
    this.abbr_word_re = '';

    // Give the current footnote number.
    this.footnote_counter = 1;

    // ### HTML Block Parser ###

    // Tags that are always treated as block tags:
    this.block_tags_re = 'p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|address|form|fieldset|iframe|hr|legend';

    // Tags treated as block tags only if the opening tag is alone on it's line:
    this.context_block_tags_re = 'script|noscript|math|ins|del';

    // Tags where markdown="1" default to span mode:
    this.contain_span_tags_re = 'p|h[1-6]|li|dd|dt|td|th|legend|address';

    // Tags which must not have their contents modified, no matter where 
    // they appear:
    this.clean_tags_re = 'script|math';

    // Tags that do not need to be closed.
    this.auto_close_tags_re = 'hr|img';

    // Redefining emphasis markers so that emphasis by underscore does not
    // work in the middle of a word.
    this.em_relist = [
        ['' , '(?:(^|[^\\*])(\\*)(?=[^\\*])|(^|[^a-zA-Z0-9_])(_)(?=[^_]))(?=\\S|$)(?![\\.,:;]\\s)'],
        ['*', '((?:\\S|^)[^\\*])(\\*)(?!\\*)'],
        ['_', '((?:\\S|^)[^_])(_)(?![a-zA-Z0-9_])']
    ];
    this.strong_relist = [
        ['' , '(?:(^|[^\\*])(\\*\\*)(?=[^\\*])|(^|[^a-zA-Z0-9_])(__)(?=[^_]))(?=\\S|$)(?![\\.,:;]\\s)'],
        ['**', '((?:\\S|^)[^\\*])(\\*\\*)(?!\\*)'],
        ['__', '((?:\\S|^)[^_])(__)(?![a-zA-Z0-9_])']
    ];
    this.em_strong_relist = [
        ['' , '(?:(^|[^\\*])(\\*\\*\\*)(?=[^\\*])|(^|[^a-zA-Z0-9_])(___)(?=[^_]))(?=\\S|$)(?![\\.,:;]\\s)'],
        ['***', '((?:\\S|^)[^\\*])(\\*\\*\\*)(?!\\*)'],
        ['___', '((?:\\S|^)[^_])(___)(?![a-zA-Z0-9_])']
    ];

    // Add extra escapable characters before parent constructor 
    // initialize the table.
    this.escape_chars += ':|';

    // Insert extra document, block, and span transformations. 
    // Parent constructor will do the sorting.
    this.document_gamut.push(['doFencedCodeBlocks',  5]);
    this.document_gamut.push(['stripFootnotes',     15]);
    this.document_gamut.push(['stripAbbreviations', 25]);
    this.document_gamut.push(['appendFootnotes',    50]);

    this.block_gamut.push(['doFencedCodeBlocks',  5]);
    this.block_gamut.push(['doTables',           15]);
    this.block_gamut.push(['doDefLists',         45]);

    this.span_gamut.push(['doFootnotes',      5]);
    this.span_gamut.push(['doAbbreviations', 70]);
}
MarkdownExtra_Parser.prototype = new Markdown_Parser();

/**
 * Setting up Extra-specific variables.
 */
MarkdownExtra_Parser.prototype.setup = function() {
    this.constructor.prototype.setup.call(this);

    this.footnotes = {};
    this.footnotes_ordered = [];
    this.abbr_desciptions = {};
    this.abbr_word_re = '';
    this.footnote_counter = 1;

    for(var abbr_word in this.predef_abbr) {
        var abbr_desc = this.predef_abbr[abbr_word];
        if(this.abbr_word_re != '') {
            this.abbr_word_re += '|';
        }
        this.abbr_word_re += this._php_preg_quote(abbr_word); // ?? str -> re?
        this.abbr_desciptions[abbr_word] = this._php_trim(abbr_desc);
    }
};

/**
 * Clearing Extra-specific variables.
 */
MarkdownExtra_Parser.prototype.teardown = function() {
    this.footnotes = {};
    this.footnotes_ordered = [];
    this.abbr_desciptions = {};
    this.abbr_word_re = '';

    this.constructor.prototype.teardown.call(this);
};


/**
 * Hashify HTML Blocks and "clean tags".
 *
 * We only want to do this for block-level HTML tags, such as headers,
 * lists, and tables. That's because we still want to wrap <p>s around
 * "paragraphs" that are wrapped in non-block-level tags, such as anchors,
 * phrase emphasis, and spans. The list of tags we're looking for is
 * hard-coded.
 *
 * This works by calling _HashHTMLBlocks_InMarkdown, which then calls
 * _HashHTMLBlocks_InHTML when it encounter block tags. When the markdown="1" 
 * attribute is found whitin a tag, _HashHTMLBlocks_InHTML calls back
 *  _HashHTMLBlocks_InMarkdown to handle the Markdown syntax within the tag.
 * These two functions are calling each other. It's recursive!
 */
MarkdownExtra_Parser.prototype.hashHTMLBlocks = function(text) {
    //
    // Call the HTML-in-Markdown hasher.
    //
    var r = this._hashHTMLBlocks_inMarkdown(text);
    text = r[0];

    return text;
};

/**
 * Parse markdown text, calling _HashHTMLBlocks_InHTML for block tags.
 *
 * *   $indent is the number of space to be ignored when checking for code 
 *     blocks. This is important because if we don't take the indent into 
 *     account, something like this (which looks right) won't work as expected:
 *
 *     <div>
 *         <div markdown="1">
 *         Hello World.  <-- Is this a Markdown code block or text?
 *         </div>  <-- Is this a Markdown code block or a real tag?
 *     <div>
 *
 *     If you don't like this, just don't indent the tag on which
 *     you apply the markdown="1" attribute.
 *
 * *   If $enclosing_tag_re is not empty, stops at the first unmatched closing 
 *     tag with that name. Nested tags supported.
 *
 * *   If $span is true, text inside must treated as span. So any double 
 *     newline will be replaced by a single newline so that it does not create 
 *     paragraphs.
 *
 * Returns an array of that form: ( processed text , remaining text )
 */
MarkdownExtra_Parser.prototype._hashHTMLBlocks_inMarkdown = function(text, indent, enclosing_tag_re, span) {
    if('undefined' === typeof indent) { indent = 0; }
    if('undefined' === typeof enclosing_tag_re) { enclosing_tag_re = ''; }
    if('undefined' === typeof span) { span = false; }

    if(text === '') { return ['', '']; }

    var matches;

    // Regex to check for the presense of newlines around a block tag.
    var newline_before_re = /(?:^\n?|\n\n)*$/;
    var newline_after_re = new RegExp(
        '^'                 + // Start of text following the tag.
        '([ ]*<!--.*?-->)?' + // Optional comment.
        '[ ]*\\n'           , // Must be followed by newline.
        'm'
    );

    // Regex to match any tag.
    var block_tag_re = new RegExp(
        '('                        + // $2: Capture hole tag.
            '</?'                  + // Any opening or closing tag.
                '('                + // Tag name.
                    this.block_tags_re         + '|' +
                    this.context_block_tags_re + '|' +
                    this.clean_tags_re         + '|' +
                    '(?!\\s)' + enclosing_tag_re +
                ')'                +
                '(?:'              +
                    '(?=[\\s"\'/a-zA-Z0-9])' + // Allowed characters after tag name.
                    '('            +
                        '".*?"|'   + // Double quotes (can contain `>`)
                        '\'.*?\'|' + // Single quotes (can contain `>`)
                        '.+?'      + // Anything but quotes and `>`.
                    ')*?'          +
                ')?'               +
            '>'                    + // End of tag.
        '|'                        +
            '<!--.*?-->'           + // HTML Comment
        '|'                        +
            '<\\?.*?\\?>|<%.*?%>'  + // Processing instruction
        '|'                        +
            '<!\\[CDATA\\[.*?\\]\\]>' + // CData Block
        '|'                        +
            // Code span marker
            '`+'                   +
        ( !span ? // If not in span.
        '|'                        +
            // Indented code block
            '(?:^[ ]*\\n|^|\\n[ ]*\\n)' +
            '[ ]{' + (indent + 4) + '}[^\\n]*\\n' +
            '(?='                  +
                '(?:[ ]{' + (indent + 4) + '}[^\\n]*|[ ]*)\\n' +
            ')*'                   +
        '|'                        +
            // Fenced code block marker
            '(?:^|\\n)'            +
            '[ ]{0,' + indent + '}~~~+[ ]*\\n'
        : '' ) + // # End (if not is span).
        ')',
        'm'
    );

    var depth = 0;		// Current depth inside the tag tree.
    var parsed = "";	// Parsed text that will be returned.

    //
    // Loop through every tag until we find the closing tag of the parent
    // or loop until reaching the end of text if no parent tag specified.
    //
    do {
        //
        // Split the text using the first $tag_match pattern found.
        // Text before  pattern will be first in the array, text after
        // pattern will be at the end, and between will be any catches made 
        // by the pattern.
        //
        var parts_available = text.match(block_tag_re); //PREG_SPLIT_DELIM_CAPTURE
        var parts;
        if(!parts_available) {
            parts = [text];
        }
        else {
            parts = [RegExp.leftContext, RegExp.lastMatch, RegExp.rightContext];
        }

        // If in Markdown span mode, add a empty-string span-level hash 
        // after each newline to prevent triggering any block element.
        if(span) {
            var _void = this.hashPart("", ':');
            var newline = _void + "\n";
            parts[0] = _void + parts[0].replace(/\n/g, newline) + _void;
        }

        parsed += parts[0]; // Text before current tag.

        // If end of $text has been reached. Stop loop.
        if(!parts_available) {
            text = "";
            break;
        }

        var tag  = parts[1]; // Tag to handle.
        text = parts[2]; // Remaining text after current tag.
        var tag_re = this._php_preg_quote(tag); // For use in a regular expression.

        var t;
        var block_text;
        //
        // Check for: Code span marker
        //
        if (tag.charAt(0) == "`") {
            // Find corresponding end marker.
            tag_re = this._php_preg_quote(tag);
            if(matches = text.match(new RegExp('^(.+?|\\n[^\\n])*?[^`]' + tag_re + '[^`]'))) {
                // End marker found: pass text unchanged until marker.
                parsed += tag + matches[0];
                text = text.substr(matches[0].length);
            }
            else {
                // Unmatched marker: just skip it.
                parsed += tag;
            }
        }
        //
        // Check for: Fenced code block marker.
        //
        else if(tag.match(new RegExp('^\\n?[ ]{0,' + (indent + 3) * '}~'))) {
            // Fenced code block marker: find matching end marker.
            tag_re = this._php_preg_quote(this._php_trim(tag));
            if(matches = text.match(new RegExp('^(?>.*\\n)+?[ ]{0,' + indent + '}' + tag_re + '[ ]*\\n'))) {
                // End marker found: pass text unchanged until marker.
                parsed += tag + matches[0];
                text = text.substr(matches[0].length);
            }
            else {
                // No end marker: just skip it.
                parsed += tag;
            }
        }
        //
        // Check for: Indented code block.
        //
        else if(tag.charAt(0) == "\n" || tag.charAt(0) == " ") {
            // Indented code block: pass it unchanged, will be handled 
            // later.
            parsed += tag;
        }
        //
        // Check for: Opening Block level tag or
        //            Opening Context Block tag (like ins and del) 
        //               used as a block tag (tag is alone on it's line).
        //
        else if (tag.match(new RegExp('^<(?:' + this.block_tags_re + ')\\b')) ||
            (
                tag.match(new RegExp('^<(?:' + this.context_block_tags_re + ')\\b')) &&
                parsed.match(newline_before_re) &&
                text.match(newline_after_re)
            )
        ) {
            // Need to parse tag and following text using the HTML parser.
            t = this._hashHTMLBlocks_inHTML(tag + text, this.hashBlock, true);
            block_text = t[0];
            text = t[1];

            // Make sure it stays outside of any paragraph by adding newlines.
            parsed += "\n\n" + block_text + "\n\n";
        }
        //
        // Check for: Clean tag (like script, math)
        //            HTML Comments, processing instructions.
        //
        else if(
            tag.match(new RegExp('^<(?:' + this.clean_tags_re + ')\\b')) ||
            tag.charAt(1) == '!' || tag.charAt(1) == '?'
        ) {
            // Need to parse tag and following text using the HTML parser.
            // (don't check for markdown attribute)
            t = this._hashHTMLBlocks_inHTML(tag + text, this.hashClean, false);
            block_text = t[0];
            text = t[1];

            parsed += block_text;
        }
        //
        // Check for: Tag with same name as enclosing tag.
        //
        else if (enclosing_tag_re !== '' &&
            // Same name as enclosing tag.
            tag.match(new RegExp('^</?(?:' + enclosing_tag_re + ')\\b'))
        ) {
            //
            // Increase/decrease nested tag count.
            //
            if (tag.charAt(1) == '/') depth--;
            else if (tag.charAt(tag.length - 2) != '/') depth++;

            if(depth < 0) {
                //
                // Going out of parent element. Clean up and break so we
                // return to the calling function.
                //
                text = tag + text;
                break;
            }

            parsed += tag;
        }
        else {
            parsed += tag;
        }
    } while(depth >= 0);

    return [parsed, text];
};

/**
 * Parse HTML, calling _HashHTMLBlocks_InMarkdown for block tags.
 *
 * *   Calls $hash_method to convert any blocks.
 * *   Stops when the first opening tag closes.
 * *   $md_attr indicate if the use of the `markdown="1"` attribute is allowed.
 *     (it is not inside clean tags)
 *
 * Returns an array of that form: ( processed text , remaining text )
 */
MarkdownExtra_Parser.prototype._hashHTMLBlocks_inHTML = function(text, hash_method, md_attr) {
    if(text === '') return ['', ''];

    var matches;

    // Regex to match `markdown` attribute inside of a tag.
    var markdown_attr_re = new RegExp(
        '\\s*'           + // Eat whitespace before the `markdown` attribute
        'markdown'       +
        '\\s*=\\s*'      +
        '(?:'            +
            '(["\'])'    + // $1: quote delimiter
            '(.*?)'      + // $2: attribute value
            '\\1'        + // matching delimiter
        '|'              +
            '([^\\s>]*)' + // $3: unquoted attribute value
        ')'              +
        '()'               // $4: make $3 always defined (avoid warnings)
    );

    // Regex to match any tag.
    var tag_re = new RegExp(
        '('                           + // $2: Capture hole tag.
            '</?'                     + // Any opening or closing tag.
                '[\\w:$]+'            + // Tag name.
                '(?:'                 +
                    '(?=[\\s"\'/a-zA-Z0-9])' + // Allowed characters after tag name.
                    '(?:'             +
                        '".*?"|'      + // Double quotes (can contain `>`)
                        '\'.*?\'|'    + // Single quotes (can contain `>`)
                        '.+?'         + // Anything but quotes and `>`.
                    ')*?'             +
                ')?'                  +
            '>'                       + // End of tag.
        '|'                           +
            '<!--.*?-->'              + // HTML Comment
        '|'                           +
            '<\\?.*?\\?>|<%.*?%>'     + // Processing instruction
        '|'                           +
            '<!\\[CDATA\\[.*?\\]\\]>' + // CData Block
        ')'
    );

    var original_text = text; // Save original text in case of faliure.

    var depth      = 0;  // Current depth inside the tag tree.
    var block_text = ""; // Temporary text holder for current text.
    var parsed     = ""; // Parsed text that will be returned.

    //
    // Get the name of the starting tag.
    // (This pattern makes $base_tag_name_re safe without quoting.)
    //
    var base_tag_name_re = "";
    if(matches = text.match(/^<([\w:$]*)\b/)) {
        base_tag_name_re = matches[1];
    }

    //
    // Loop through every tag until we find the corresponding closing tag.
    //
    do {
        //
        // Split the text using the first $tag_match pattern found.
        // Text before  pattern will be first in the array, text after
        // pattern will be at the end, and between will be any catches made 
        // by the pattern.
        //
        var parts_available = text.match(tag_re); //PREG_SPLIT_DELIM_CAPTURE);
        // If end of $text has been reached. Stop loop.
        if(!parts_available) {
            //
            // End of $text reached with unbalenced tag(s).
            // In that case, we return original text unchanged and pass the
            // first character as filtered to prevent an infinite loop in the 
            // parent function.
            //
            return [original_text.charAt(0), original_text.substr(1)];
        }
        var parts = [RegExp.leftContext, RegExp.lastMatch, RegExp.rightContext];

        block_text += parts[0]; // Text before current tag.
        var tag     = parts[1]; // Tag to handle.
        text        = parts[2]; // Remaining text after current tag.

        //
        // Check for: Auto-close tag (like <hr/>)
        //			 Comments and Processing Instructions.
        //
        if(tag.match(new RegExp('^</?(?:' + this.auto_close_tags_re + ')\\b')) ||
            tag.charAt(1) == '!' || tag.charAt(1) == '?')
        {
            // Just add the tag to the block as if it was text.
            block_text += tag;
        }
        else {
            //
            // Increase/decrease nested tag count. Only do so if
            // the tag's name match base tag's.
            //
            if (tag.match(new RegExp('^</?' + base_tag_name_re + '\\b'))) {
                if(tag.charAt(1) == '/') { depth--; }
                else if(tag.charAt(tag.length - 2) != '/') { depth++; }
            }

            //
            // Check for `markdown="1"` attribute and handle it.
            //
            var attr_m;
            if(md_attr &&
                (attr_m = tag.match(markdown_attr_re)) &&
                (attr_m[2] + attr_m[3]).match(/^1|block|span$/))
            {
                // Remove `markdown` attribute from opening tag.
                tag = tag.replace(markdown_attr_re, '');

                // Check if text inside this tag must be parsed in span mode.
                this.mode = attr_m[2] + attr_m[3];
                var span_mode = this.mode == 'span' || this.mode != 'block' &&
                    tag.match(new RegExp('^<(?:' + this.contain_span_tags_re + ')\\b'));

                // Calculate indent before tag.
                var indent;
                if (matches = block_text.match(/(?:^|\n)( *?)(?! ).*?$/)) {
                    //var strlen = this.utf8_strlen;
                    indent = matches[1].length; //strlen(matches[1], 'UTF-8');
                } else {
                    indent = 0;
                }

                // End preceding block with this tag.
                block_text += tag;
                parsed += hash_method.call(this, block_text);

                // Get enclosing tag name for the ParseMarkdown function.
                // (This pattern makes $tag_name_re safe without quoting.)
                matches = tag.match(/^<([\w:$]*)\b/);
                var tag_name_re = matches[1];

                // Parse the content using the HTML-in-Markdown parser.
                var t = this._hashHTMLBlocks_inMarkdown(text, indent, tag_name_re, span_mode);
                block_text = t[0];
                text = t[1];

                // Outdent markdown text.
                if(indent > 0) {
                    block_text = block_text.replace(new RegExp('/^[ ]{1,' + indent + '}', 'm'), "");
                }

                // Append tag content to parsed text.
                if (!span_mode) { parsed += "\n\n" + block_text + "\n\n"; }
                else { parsed += block_text; }

                // Start over a new block.
                block_text = "";
            }
            else {
                block_text += tag;
            }
        }

    } while(depth > 0);

    //
    // Hash last block text that wasn't processed inside the loop.
    //
    parsed += hash_method.call(this, block_text);

    return [parsed, text];
};


/**
 * Called whenever a tag must be hashed when a function insert a "clean" tag
 * in $text, it pass through this function and is automaticaly escaped, 
 * blocking invalid nested overlap.
 */
MarkdownExtra_Parser.prototype.hashClean = function(text) {
    return this.hashPart(text, 'C');
};


/**
 * Redefined to add id attribute support.
 */
MarkdownExtra_Parser.prototype.doHeaders = function(text) {
    var self = this;

    function _doHeaders_attr(attr) {
        if('undefined' === typeof attr || attr == "") {  return ""; }
        return " id=\"" + attr + "\"";
    }

    // Setext-style headers:
    //    Header 1  {#header1}
    //    ========
    //
    //    Header 2  {#header2}
    //    --------

    text = text.replace(new RegExp(
        '(^.+?)'                              + // $1: Header text
        '(?:[ ]+\\{\\#([-_:a-zA-Z0-9]+)\\})?' + // $2: Id attribute
        '[ ]*\\n(=+|-+)[ ]*\\n+',               // $3: Header footer
         'mg'
    ), function(match, span, id, line) {
       //console.log(match);
        if(line == '-' && span.match(/^- /)) {
            return match;
        }
        var level = line.charAt(0) == '=' ? 1 : 2;
        var attr = _doHeaders_attr(id);
        var block = "<h" + level + attr + ">" + self.runSpanGamut(span) + "</h" + level + ">";
        return "\n" + self.hashBlock(block)  + "\n\n";
    });

    // atx-style headers:
    //    # Header 1        {#header1}
    //    ## Header 2       {#header2}
    //    ## Header 2 with closing hashes ##  {#header3}
    //    ...
    //    ###### Header 6   {#header2}

    text = text.replace(new RegExp(
        '^(\\#{1,6})' + // $1 = string of #\'s
        '[ ]*'        +
        '(.+?)'       + // $2 = Header text
        '[ ]*'        +
        '\\#*'        + // optional closing #\'s (not counted)
        '(?:[ ]+\\{\\#([-_:a-zA-Z0-9]+)\\})?' + // id attribute
        '\\n+',
        'mg'
    ), function(match, hashes, span, id) {
        //console.log(match);
        var level = hashes.length;
        var attr = _doHeaders_attr(id);
        var block = "<h" + level + attr + ">" + self.runSpanGamut(span) + "</h" + level + ">";
        return "\n" + self.hashBlock(block) + "\n\n";
    });

    return text;
};

/**
 * Form HTML tables.
 */
MarkdownExtra_Parser.prototype.doTables = function(text) {
    var self = this;

    var less_than_tab = this.tab_width - 1;

    var _doTable_callback = function(match, head, underline, content) {
        //console.log(match);
        // Remove any tailing pipes for each line.
        head = head.replace(/[|] *$/m, '');
        underline = underline.replace(/[|] *$/m, '');
        content = content.replace(/[|] *$/m, '');

        var attr = [];

        // Reading alignement from header underline.
        var separators = underline.split(/[ ]*[|][ ]*/);
        var n;
        for(n = 0; n < separators.length; n++) {
            var s = separators[n];
            if (s.match(/^ *-+: *$/))       { attr[n] = ' align="right"'; }
            else if (s.match(/^ *:-+: *$/)) { attr[n] = ' align="center"'; }
            else if (s.match(/^ *:-+ *$/))  { attr[n] = ' align="left"'; }
            else                            { attr[n] = ''; }
        }

        // Parsing span elements, including code spans, character escapes, 
        // and inline HTML tags, so that pipes inside those gets ignored.
        head = self.parseSpan(head);
        var headers = head.split(/ *[|] */);
        var col_count = headers.length;

        // Write column headers.
        var text = "<table>\n";
        text += "<thead>\n";
        text += "<tr>\n";
        for(n = 0; n < headers.length; n++) {
            var header = headers[n];
            text += "  <th" + attr[n] + ">" + self.runSpanGamut(self._php_trim(header)) + "</th>\n";
        }
        text += "</tr>\n";
        text += "</thead>\n";

        // Split content by row.
        var rows = self._php_trim(content, "\n").split("\n");

        text += "<tbody>\n";
        for(var i = 0; i < rows.length; i++) {
            var row = rows[i];
            // Parsing span elements, including code spans, character escapes, 
            // and inline HTML tags, so that pipes inside those gets ignored.
            row = self.parseSpan(row);

            // Split row by cell.
            var row_cells = row.split(/ *[|] */, col_count);
            while(row_cells.length < col_count) { row_cells.push(''); }

            text += "<tr>\n";
            for(n = 0; n < row_cells.length; n++) {
                var cell = row_cells[n];
                text += "  <td" + attr[n] + ">" + self.runSpanGamut(self._php_trim(cell)) + "</td>\n";
            }
            text += "</tr>\n";
        }
        text += "</tbody>\n";
        text += "</table>";

        return self.hashBlock(text) + "\n";
    };

    text = this.__wrapSTXETX__(text);

    //
    // Find tables with leading pipe.
    //
    //	| Header 1 | Header 2
    //	| -------- | --------
    //	| Cell 1   | Cell 2
    //	| Cell 3   | Cell 4
    //
    text = text.replace(new RegExp(
        '^'                            + // Start of a line
        '[ ]{0,' + less_than_tab + '}' + // Allowed whitespace.
        '[|]'                          + // Optional leading pipe (present)
        '(.+)\\n'                      + // $1: Header row (at least one pipe)

        '[ ]{0,' + less_than_tab + '}' + // Allowed whitespace.
        '[|]([ ]*[-:]+[-| :]*)\\n'     + // $2: Header underline

        '('                            + // $3: Cells
            '(?:'                      +
                '[ ]*'                 + // Allowed whitespace.
                '[|].*\\n'             + // Row content.
            ')*'                       +
        ')'                            +
        '(?=\\n|\\x03)'                , // Stop at final double newline.
        'mg'
    ), function(match, head, underline, content) {
        // Remove leading pipe for each row.
        content = content.replace(/^ *[|]/m, '');

        return _doTable_callback.call(this, match, head, underline, content);
    });

    //
    // Find tables without leading pipe.
    //
    //	Header 1 | Header 2
    //	-------- | --------
    //	Cell 1   | Cell 2
    //	Cell 3   | Cell 4
    //
    text = text.replace(new RegExp(
        '^'                             + // Start of a line
        '[ ]{0,' + less_than_tab + '}'  + // Allowed whitespace.
        '(\\S.*[|].*)\\n'               + // $1: Header row (at least one pipe)

        '[ ]{0,' + less_than_tab + '}'  + // Allowed whitespace.
        '([-:]+[ ]*[|][-| :]*)\\n'      + // $2: Header underline

        '('                             + // $3: Cells
            '(?:'                       +
                '.*[|].*\\n'            + // Row content
            ')*'                        +
        ')'                             +
        '(?=\\n|\\x03)'                 , // Stop at final double newline.
        'mg'
    ), _doTable_callback);

    text = this.__unwrapSTXETX__(text);

    return text;
};

/**
 * Form HTML definition lists.
 */
MarkdownExtra_Parser.prototype.doDefLists = function(text) {
    var self = this;

    var less_than_tab = this.tab_width - 1;

    // Re-usable pattern to match any entire dl list:
    var whole_list_re = '(?:'     +
        '('                       + // $1 = whole list
          '('                     + // $2
            '[ ]{0,' + less_than_tab + '}' +
            '((?:[ \\t]*\\S.*\\n)+)' + // $3 = defined term
                                       // [porting note] Original regex from PHP is
                                       // (?>.*\S.*\n), which matches a line with at
                                       // least one non-space character. Change the
                                       // first .* to [ \t]* stops unneccessary
                                       // backtracking hence improves performance
            '\\n?'                +
            '[ ]{0,' + less_than_tab + '}:[ ]+' + // colon starting definition
          ')'                     +
          '([\\s\\S]+?)'          +
          '('                     + // $4
              '(?=\\0x03)'        + // \z
            '|'                   +
              '(?='               + // [porting note] Our regex will consume leading
                                    // newline characters so we will leave the newlines
                                    // here for the next definition
                '\\n{2,}'         +
                '(?=\\S)'         +
                '(?!'             + // Negative lookahead for another term
                  '[ ]{0,' + less_than_tab + '}' +
                  '(?:\\S.*\\n)+?' + // defined term
                  '\\n?'          +
                  '[ ]{0,' + less_than_tab + '}:[ ]+' + // colon starting definition
                ')'               +
                '(?!'             + // Negative lookahead for another definition
                  '[ ]{0,' + less_than_tab + '}:[ ]+' + // colon starting definition
                ')'               +
              ')'                 +
          ')'                     +
        ')'                       +
    ')'; // mx

    text = this.__wrapSTXETX__(text);
    text = text.replace(new RegExp(
        '(\\x02\\n?|\\n\\n)' +
        whole_list_re, 'mg'
    ), function(match, pre, list) {
        //console.log(match);
        // Re-usable patterns to match list item bullets and number markers:
        // [portiong note] changed to list = $2 in order to reserve previously \n\n.

        // Turn double returns into triple returns, so that we can make a
        // paragraph for the last item in a list, if necessary:
        var result = self._php_trim(self.processDefListItems(list));
        result = "<dl>\n" + result + "\n</dl>";
        return pre + self.hashBlock(result) + "\n\n";
    });
    text = this.__unwrapSTXETX__(text);

    return text;
};

/**
 * Process the contents of a single definition list, splitting it
 * into individual term and definition list items.
 */
MarkdownExtra_Parser.prototype.processDefListItems = function(list_str) {
    var self = this;

    var less_than_tab = this.tab_width - 1;

    list_str = this.__wrapSTXETX__(list_str);

    // trim trailing blank lines:
    list_str = list_str.replace(/\n{2,}(?=\\x03)/, "\n");

    // Process definition terms.
    list_str = list_str.replace(new RegExp(
        '(\\x02\\n?|\\n\\n+)'              + // leading line
        '('                                + // definition terms = $1
            '[ ]{0,' + less_than_tab + '}' + // leading whitespace
            '(?![:][ ]|[ ])'               + // negative lookahead for a definition 
                                             //   mark (colon) or more whitespace.
            '(?:\\S.*\\n)+?'               + // actual term (not whitespace).
        ')'                                +
        '(?=\\n?[ ]{0,3}:[ ])'             , // lookahead for following line feed 
                                             //   with a definition mark.
        'mg'
    ), function(match, pre, terms_str) {
        // [portiong note] changed to list = $2 in order to reserve previously \n\n.
        var terms = self._php_trim(terms_str).split("\n");
        var text = '';
        for (var i = 0; i < terms.length; i++) {
            var term = terms[i];
            term = self.runSpanGamut(self._php_trim(term));
            text += "\n<dt>" + term + "</dt>";
        }
        return text + "\n";
    });

    // Process actual definitions.
    list_str = list_str.replace(new RegExp(
        '\\n(\\n+)?'                       + // leading line = $1
        '('                                + // marker space = $2
            '[ ]{0,' + less_than_tab + '}' + // whitespace before colon
            '[:][ ]+'                      + // definition mark (colon)
        ')'                                +
        '([\\s\\S]+?)'                     + // definition text = $3
                                             // [porting note] Maybe no trailing
                                             // newlines in our version, changed the
                                             // following line from \n+ to \n*.
        '(?=\\n*'                          + // stop at next definition mark,
            '(?:'                          + // next term or end of text
                '\\n[ ]{0,' + less_than_tab + '}[:][ ]|' + // [porting note] do not match
                                                           // colon in the middle of a line
                '<dt>|\\x03'               + // \z
            ')'                            +
        ')',
        'mg'
    ), function(match, leading_line, marker_space, def) {
        if (leading_line || def.match(/\n{2,}/)) {
            // Replace marker with the appropriate whitespace indentation
            def = self._php_str_repeat(' ', marker_space.length) + def;
            def = self.runBlockGamut(self.outdent(def + "\n\n"));
            def = "\n" + def + "\n";
        }
        else {
            def = self._php_rtrim(def);
            def = self.runSpanGamut(self.outdent(def));
        }

        return "\n<dd>"  + def + "</dd>\n";
    });

    list_str = this.__unwrapSTXETX__(list_str);

    return list_str;
};

/**
 * Adding the fenced code block syntax to regular Markdown:
 *
 * ~~~
 * Code block
 * ~~~
 */
MarkdownExtra_Parser.prototype.doFencedCodeBlocks = function(text) {
    var self = this;

    var less_than_tab = this.tab_width;

    text = this.__wrapSTXETX__(text);
    text = text.replace(new RegExp(
        '(?:\\n|\\x02)'          +
        // 1: Opening marker
        '('                      +
            '~{3,}'              + // Marker: three tilde or more.
        ')'                      +
        '[ ]*\\n'                + // Whitespace and newline following marker.
        // 2: Content
        '('                      +
            '(?:'                +
                '(?!\\1[ ]*\\n)' + // Not a closing marker.
                '.*\\n+'         +
            ')+'                 +
        ')'                      +
        // Closing marker.
        '\\1[ ]*\\n',
        "mg"
    ), function(match, m1, codeblock) {
        codeblock = self._php_htmlspecialchars_ENT_NOQUOTES(codeblock);
        codeblock = codeblock.replace(/^\n+/, function(match) {
            return self._php_str_repeat("<br" + self.empty_element_suffix, match.length);
        });
        codeblock = "<pre><code>" + codeblock + "</code></pre>";
        return "\n\n" + self.hashBlock(codeblock) + "\n\n";
    });
    text = this.__unwrapSTXETX__(text);

    return text;
};

/**
 * Params:
 * $text - string to process with html <p> tags
 */
MarkdownExtra_Parser.prototype.formParagraphs = function(text) {

    // Strip leading and trailing lines:
    text = this.__wrapSTXETX__(text);
    text = text.replace(/(?:\x02)\n+|\n+(?:\x03)/g, "");
    text = this.__unwrapSTXETX__(text);

    var grafs = text.split(/\n{2,}/m);
    //preg_split('/\n{2,}/', $text, -1, PREG_SPLIT_NO_EMPTY);

    //
    // Wrap <p> tags and unhashify HTML blocks
    //
    for(var i = 0; i < grafs.length; i++) {
        var value = grafs[i];
        if(value == "") {
            // [porting note]
            // This case is replacement for PREG_SPLIT_NO_EMPTY.
            continue;
        }
        value = this._php_trim(this.runSpanGamut(value));

        // Check if this should be enclosed in a paragraph.
        // Clean tag hashes & block tag hashes are left alone.
        var is_p = !value.match(/^B\x1A[0-9]+B|^C\x1A[0-9]+C$/);

        if (is_p) {
            value = "<p>" + value + "</p>";
        }
        grafs[i] = value;
    }

    // Join grafs in one text, then unhash HTML tags. 
    text = grafs.join("\n\n");

    // Finish by removing any tag hashes still present in $text.
    text = this.unhash(text);

    return text;
};

// ### Footnotes

/**
 * Strips link definitions from text, stores the URLs and titles in
 * hash references.
 */
MarkdownExtra_Parser.prototype.stripFootnotes = function(text) {
    var self = this;

    var less_than_tab = this.tab_width - 1;

    // Link defs are in the form: [^id]: url "optional title"
    text = text.replace(new RegExp(
        '^[ ]{0,' + less_than_tab + '}\\[\\^(.+?)\\][ ]?:' + // note_id = $1
          '[ ]*'                       +
          '\\n?'                       + // maybe *one* newline
        '('                            + // text = $2 (no blank lines allowed)
            '(?:'                      +
                '.+'                   + // actual text
            '|'                        +
                '\\n'                  + // newlines but 
                '(?!\\[\\^.+?\\]:\\s)' + // negative lookahead for footnote marker.
                '(?!\\n+[ ]{0,3}\\S)'  + // ensure line is not blank and followed 
                                         // by non-indented content
            ')*'                       +
        ')',
        "mg"
    ), function(match, m1, m2) {
        var note_id = self.fn_id_prefix + m1;
        self.footnotes[note_id] = self.outdent(m2);
        return ''; //# String that will replace the block
    });
    return text;
};

/**
 * Replace footnote references in $text [^id] with a special text-token 
 * which will be replaced by the actual footnote marker in appendFootnotes.
 */
MarkdownExtra_Parser.prototype.doFootnotes = function(text) {
    if (!this.in_anchor) {
        text = text.replace(/\[\^(.+?)\]/g, "F\x1Afn:$1\x1A:");
    }
    return text;
};

/**
 * Append footnote list to text.
 */
MarkdownExtra_Parser.prototype.appendFootnotes = function(text) {
    var self = this;

    var _appendFootnotes_callback = function(match, m1) {
        var node_id = self.fn_id_prefix + m1;

        // Create footnote marker only if it has a corresponding footnote *and*
        // the footnote hasn't been used by another marker.
        if (node_id in self.footnotes) {
            // Transfert footnote content to the ordered list.
            self.footnotes_ordered.push([node_id, self.footnotes[node_id]]);
            delete self.footnotes[node_id];

            var num = self.footnote_counter++;
            var attr = " rel=\"footnote\"";
            if (self.fn_link_class != "") {
                var classname = self.fn_link_class;
                classname = self.encodeAttribute(classname);
                attr += " class=\"" + classname + "\"";
            }
            if (self.fn_link_title != "") {
                var title = self.fn_link_title;
                title = self.encodeAttribute(title);
                attr += " title=\"" + title +"\"";
            }

            attr = attr.replace(/%%/g, num);
            node_id = self.encodeAttribute(node_id);

            return "<sup id=\"fnref:" + node_id + "\">" +
                "<a href=\"#fn:" + node_id + "\"" + attr + ">" + num + "</a>" +
                "</sup>";
        }

        return "[^" + m1 + "]";
    };

    text = text.replace(/F\x1Afn:(.*?)\x1A:/g, _appendFootnotes_callback);

    if (this.footnotes_ordered.length > 0) {
        text += "\n\n";
        text += "<div class=\"footnotes\">\n";
        text += "<hr" + this.empty_element_suffix  + "\n";
        text += "<ol>\n\n";

        var attr = " rev=\"footnote\"";
        if (this.fn_backlink_class != "") {
            var classname = this.fn_backlink_class;
            classname = this.encodeAttribute(classname);
            attr += " class=\"" + classname + "\"";
        }
        if (this.fn_backlink_title != "") {
            var title = this.fn_backlink_title;
            title = this.encodeAttribute(title);
            attr += " title=\"" + title + "\"";
        }
        var num = 0;

        while (this.footnotes_ordered.length > 0) {
            var head = this.footnotes_ordered.shift();
            var note_id = head[0];
            var footnote = head[1];

            footnote += "\n"; // Need to append newline before parsing.
            footnote = this.runBlockGamut(footnote + "\n");
            footnote = footnote.replace(/F\x1Afn:(.*?)\x1A:/g, _appendFootnotes_callback);

            attr = attr.replace(/%%/g, ++num);
            note_id = this.encodeAttribute(note_id);

            // Add backlink to last paragraph; create new paragraph if needed.
            var backlink = "<a href=\"#fnref:" + note_id + "\"" + attr + ">&#8617;</a>";
            if (footnote.match(/<\/p>$/)) {
                footnote = footnote.substr(0, footnote.length - 4) + "&#160;" + backlink + "</p>";
            } else {
                footnote += "\n\n<p>" + backlink + "</p>";
            }

            text += "<li id=\"fn:" + note_id + "\">\n";
            text += footnote + "\n";
            text += "</li>\n\n";
        }

        text += "</ol>\n";
        text += "</div>";
    }
    return text;
};

//### Abbreviations ###

/**
 * Strips abbreviations from text, stores titles in hash references.
 */
MarkdownExtra_Parser.prototype.stripAbbreviations = function(text) {
    var self = this;

    var less_than_tab = this.tab_width - 1;

    // Link defs are in the form: [id]*: url "optional title"
    text = text.replace(new RegExp(
        '^[ ]{0,' + less_than_tab + '}\\*\\[(.+?)\\][ ]?:' + // abbr_id = $1
        '(.*)',   // text = $2 (no blank lines allowed)
        "m"
    ), function(match, abbr_word, abbr_desc) {
        if (self.abbr_word_re != '') {
            self.abbr_word_re += '|';
        }
        self.abbr_word_re += self._php_preg_quote(abbr_word);
        self.abbr_desciptions[abbr_word] = self._php_trim(abbr_desc);
        return ''; // String that will replace the block
    });
    return text;
};

/**
 * Find defined abbreviations in text and wrap them in <abbr> elements.
 */
MarkdownExtra_Parser.prototype.doAbbreviations = function(text) {
    var self = this;

    if (this.abbr_word_re) {
        // cannot use the /x modifier because abbr_word_re may 
        // contain significant spaces:
        text = text.replace(new RegExp(
            '(^|[^\\w\\x1A])'             +
            '(' + this.abbr_word_re + ')' +
            '(?![\\w\\x1A])'
        ), function(match, prev, abbr) {
            if (abbr in self.abbr_desciptions) {
                var desc = self.abbr_desciptions[abbr];
                if (!desc || desc == "") {
                    return self.hashPart("<abbr>" + abbr + "</abbr>");
                } else {
                    desc = self.encodeAttribute(desc);
                    return self.hashPart("<abbr title=\"" + desc + "\">" + abbr + "</abbr>");
                }
            } else {
                return match;
            }
        });
    }
    return text;
};


/**
 * Export to Node.js
 */
this.Markdown = Markdown;
this.Markdown_Parser = Markdown_Parser;
this.MarkdownExtra_Parser = MarkdownExtra_Parser;


/*!
 * jsUri
 * https://github.com/derek-watson/jsUri
 *
 * Copyright 2012, Derek Watson
 * Released under the MIT license.
 *
 * Includes parseUri regular expressions
 * http://blog.stevenlevithan.com/archives/parseuri
 * Copyright 2007, Steven Levithan
 * Released under the MIT license.
 *
 */

(function(global) {

    /**
     * Define forEach for older js environments
     * @see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/forEach#Compatibility
     */
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function(fn, scope) {
            for (var i = 0, len = this.length; i < len; ++i) {
                fn.call(scope || this, this[i], i, this);
            }
        };
    }

    /**
     * unescape a query param value
     * @param  {string} s encoded value
     * @return {string}   decoded value
     */
    function decode(s) {
        s = decodeURIComponent(s);
        s = s.replace('+', ' ');
        return s;
    }

    /**
     * Breaks a uri string down into its individual parts
     * @param  {string} str uri
     * @return {object}     parts
     */
    function parseUri(str) {
        var parser = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/,
            parserKeys = ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
            m = parser.exec(str || ''),
            parts = {};

        parserKeys.forEach(function(key, i) {
            parts[key] = m[i] || '';
        });
        return parts;
    }

    /**
     * Breaks a query string down into an array of key/value pairs
     * @param  {string} str query
     * @return {array}      array of arrays (key/value pairs)
     */
    function parseQuery(str) {
        var i, ps, p, kvp, k, v,
            pairs = [];

        if (typeof(str) === 'undefined' || str === null || str === '') {
            return pairs;
        }

        if (str.indexOf('?') === 0) {
            str = str.substring(1);
        }

        ps = str.toString().split(/[&;]/);

        for (i = 0; i < ps.length; i++) {
            p = ps[i];
            kvp = p.split('=');
            k = kvp[0];
            v = p.indexOf('=') === -1 ? null : (kvp[1] === null ? '' : kvp[1]);
            pairs.push([k, v]);
        }
        return pairs;
    }

    /**
     * Creates a new Uri object
     * @constructor
     * @param {string} str
     */
    function Uri(str) {
        this.uriParts = parseUri(str);
        this.queryPairs = parseQuery(this.uriParts.query);
        this.hasAuthorityPrefixUserPref = null;
    }

    /**
     * Define getter/setter methods
     */
    ['protocol', 'userInfo', 'host', 'port', 'path', 'anchor'].forEach(function(key) {
        Uri.prototype[key] = function(val) {
            if (typeof val !== 'undefined') {
                this.uriParts[key] = val;
            }
            return this.uriParts[key];
        };
    });

    /**
     * if there is no protocol, the leading // can be enabled or disabled
     * @param  {Boolean}  val
     * @return {Boolean}
     */
    Uri.prototype.hasAuthorityPrefix = function(val) {
        if (typeof val !== 'undefined') {
            this.hasAuthorityPrefixUserPref = val;
        }

        if (this.hasAuthorityPrefixUserPref === null) {
            return (this.uriParts.source.indexOf('//') !== -1);
        } else {
            return this.hasAuthorityPrefixUserPref;
        }
    };

    /**
     * Serializes the internal state of the query pairs
     * @param  {string} [val]   set a new query string
     * @return {string}         query string
     */
    Uri.prototype.query = function(val) {
        var s = '',
            i, param;

        if (typeof val !== 'undefined') {
            this.queryPairs = parseQuery(val);
        }

        for (i = 0; i < this.queryPairs.length; i++) {
            param = this.queryPairs[i];
            if (s.length > 0) {
                s += '&';
            }
            if (param[1] === null) {
                s += param[0];
            } else {
                s += param.join('=');
            }
        }
        return s.length > 0 ? '?' + s : s;
    };

    /**
     * returns the first query param value found for the key
     * @param  {string} key query key
     * @return {string}     first value found for key
     */
    Uri.prototype.getQueryParamValue = function (key) {
        var param, i;
        for (i = 0; i < this.queryPairs.length; i++) {
            param = this.queryPairs[i];
            if (decode(key) === decode(param[0])) {
                return param[1];
            }
        }
    };

    /**
     * returns an array of query param values for the key
     * @param  {string} key query key
     * @return {array}      array of values
     */
    Uri.prototype.getQueryParamValues = function (key) {
        var arr = [],
            i, param;
        for (i = 0; i < this.queryPairs.length; i++) {
            param = this.queryPairs[i];
            if (decode(key) === decode(param[0])) {
                arr.push(param[1]);
            }
        }
        return arr;
    };

    /**
     * removes query parameters
     * @param  {string} key     remove values for key
     * @param  {val}    [val]   remove a specific value, otherwise removes all
     * @return {Uri}            returns self for fluent chaining
     */
    Uri.prototype.deleteQueryParam = function (key, val) {
        var arr = [],
            i, param, keyMatchesFilter, valMatchesFilter;

        for (i = 0; i < this.queryPairs.length; i++) {

            param = this.queryPairs[i];
            keyMatchesFilter = decode(param[0]) === decode(key);
            valMatchesFilter = decode(param[1]) === decode(val);

            if ((arguments.length === 1 && !keyMatchesFilter) || (arguments.length === 2 && !keyMatchesFilter && !valMatchesFilter)) {
                arr.push(param);
            }
        }

        this.queryPairs = arr;

        return this;
    };

    /**
     * adds a query parameter
     * @param  {string}  key        add values for key
     * @param  {string}  val        value to add
     * @param  {integer} [index]    specific index to add the value at
     * @return {Uri}                returns self for fluent chaining
     */
    Uri.prototype.addQueryParam = function (key, val, index) {
        if (arguments.length === 3 && index !== -1) {
            index = Math.min(index, this.queryPairs.length);
            this.queryPairs.splice(index, 0, [key, val]);
        } else if (arguments.length > 0) {
            this.queryPairs.push([key, val]);
        }
        return this;
    };

    /**
     * replaces query param values
     * @param  {string} key         key to replace value for
     * @param  {string} newVal      new value
     * @param  {string} [oldVal]    replace only one specific value (otherwise replaces all)
     * @return {Uri}                returns self for fluent chaining
     */
    Uri.prototype.replaceQueryParam = function (key, newVal, oldVal) {

        var index = -1,
            i, param;

        if (arguments.length === 3) {
            for (i = 0; i < this.queryPairs.length; i++) {
                param = this.queryPairs[i];
                if (decode(param[0]) === decode(key) && decodeURIComponent(param[1]) === decode(oldVal)) {
                    index = i;
                    break;
                }
            }
            this.deleteQueryParam(key, oldVal).addQueryParam(key, newVal, index);
        } else {
            for (i = 0; i < this.queryPairs.length; i++) {
                param = this.queryPairs[i];
                if (decode(param[0]) === decode(key)) {
                    index = i;
                    break;
                }
            }
            this.deleteQueryParam(key);
            this.addQueryParam(key, newVal, index);
        }
        return this;
    };

    /**
     * Define fluent setter methods (setProtocol, setHasAuthorityPrefix, etc)
     */
    ['protocol', 'hasAuthorityPrefix', 'userInfo', 'host', 'port', 'path', 'query', 'anchor'].forEach(function(key) {
        var method = 'set' + key.charAt(0).toUpperCase() + key.slice(1);
        Uri.prototype[method] = function(val) {
            this[key](val);
            return this;
        };
    });

    /**
     * Scheme name, colon and doubleslash, as required
     * @return {string} http:// or possibly just //
     */
    Uri.prototype.scheme = function() {

        var s = '';

        if (this.protocol()) {
            s += this.protocol();
            if (this.protocol().indexOf(':') !== this.protocol().length - 1) {
                s += ':';
            }
            s += '//';
        } else {
            if (this.hasAuthorityPrefix() && this.host()) {
                s += '//';
            }
        }

        return s;
    };

    /**
     * Same as Mozilla nsIURI.prePath
     * @return {string} scheme://user:password@host:port
     * @see  https://developer.mozilla.org/en/nsIURI
     */
    Uri.prototype.origin = function() {

        var s = this.scheme();

        if (this.userInfo() && this.host()) {
            s += this.userInfo();
            if (this.userInfo().indexOf('@') !== this.userInfo().length - 1) {
                s += '@';
            }
        }

        if (this.host()) {
            s += this.host();
            if (this.port()) {
                s += ':' + this.port();
            }
        }

        return s;
    };

    /**
     * Serializes the internal state of the Uri object
     * @return {string}
     */
    Uri.prototype.toString = function() {

        var s = this.origin();

        if (this.path()) {
            s += this.path();
        } else {
            if (this.host() && (this.query().toString() || this.anchor())) {
                s += '/';
            }
        }
        if (this.query().toString()) {
            if (this.query().toString().indexOf('?') !== 0) {
                s += '?';
            }
            s += this.query().toString();
        }

        if (this.anchor()) {
            if (this.anchor().indexOf('#') !== 0) {
                s += '#';
            }
            s += this.anchor();
        }

        return s;
    };

    /**
     * Clone a Uri object
     * @return {Uri} duplicate copy of the Uri
     */
    Uri.prototype.clone = function() {
        return new Uri(this.toString());
    };

    /**
     * export via CommonJS, otherwise leak a global
     */
    if (typeof module === 'undefined') {
        global.Uri = Uri;
    } else {
        module.exports = Uri;
    }
}(this));

/*jslint browser: true, devel: true, todo: true, unparam: true */
/*global define, btoa, Markdown */
/*
 Copyright 2014 Red Hat Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('strata', ['jquery', 'jsUri'], factory);
    } else {
        root.strata = factory(root.$, root.Uri);
    }
}(this, function ($, Uri) {
    'use strict';

    var strata = {},
    //Since we can't set the UserAgent
        redhatClient = "redhat_client",
        redhatClientID,
        //Internal copy of user, might be useful for logging, only valid for cookie auth
        authedUser = {},
        basicAuthToken = "",
        portalHostname,
        strataHostname,
        baseAjaxParams = {},
        authAjaxParams,
        checkCredentials,
        checkCredentialsNoBasic,
        fetchSolution,
        fetchArticle,
        searchArticles,
        fetchCase,
        fetchCaseComments,
        createComment,
        fetchCases,
        fetchCasesCSV,
        addNotifiedUser,
        removeNotifiedUser,
        updateCase,
        filterCases,
        createAttachment,
        deleteAttachment,
        listCaseAttachments,
        getSymptomsFromText,
        listGroups,
        createGroup,
        deleteGroup,
        fetchGroup,
        listProducts,
        fetchProduct,
        fetchProductVersions,
        caseTypes,
        caseSeverities,
        caseStatus,
        fetchSystemProfiles,
        fetchSystemProfile,
        createSystemProfile,
        fetchAccounts,
        fetchAccount,
        fetchURI,
        fetchEntitlements,
        authHostname,
        fetchAccountUsers;

    strata.version = "1.0.33";
    redhatClientID = "stratajs-" + strata.version;

    if (window.portal && window.portal.host) {
        //if this is a chromed app this will work otherwise we default to prod
        portalHostname = new Uri(window.portal.host).host();
        authHostname = portalHostname;

    } else {
        portalHostname = 'access.redhat.com';
        authHostname = portalHostname;
    }

    if(localStorage && localStorage.getItem('portalHostname')) {
        portalHostname = localStorage.getItem('portalHostname');
    }

    strataHostname = new Uri('https://api.' + portalHostname);
    strataHostname.addQueryParam(redhatClient, redhatClientID);

    strata.setRedhatClientID = function (id) {
        redhatClientID = id;
        strataHostname = new Uri(strataHostname);
        strataHostname.addQueryParam(redhatClient, redhatClientID);
    };

    strata.setStrataHostname = function (hostname) {
        portalHostname = hostname;
        strataHostname = new Uri(portalHostname);
        strataHostname.addQueryParam(redhatClient, redhatClientID);
    };

    strata.setPortalHostname = function (hostname) {
        portalHostname = hostname;
        authHostname = hostname;
        strataHostname = new Uri('https://api.' + portalHostname);
        strataHostname.addQueryParam(redhatClient, redhatClientID);
    };

    strata.setAuthHostname = function (hostname) {
        authHostname = hostname;
        authAjaxParams = $.extend({
            url: 'https://' + authHostname +
                '/services/user/status?jsoncallback=?',
            dataType: 'jsonp'
        }, baseAjaxParams);
    };

    strata.getAuthInfo = function () {
        return authedUser;
    };

    //Store Base64 Encoded Auth Token
    basicAuthToken = localStorage.getItem("rhAuthToken");
    authedUser.login = localStorage.getItem("rhUserName");

    strata.setCredentials = function (username, password) {
        if(isASCII(username + password)){
            basicAuthToken = btoa(username + ":" + password);
            localStorage.setItem("rhAuthToken", basicAuthToken);
            localStorage.setItem("rhUserName", username);
            authedUser.login = username;
            return true;
        } else{
            return false;
        }
    };

    function isASCII(str) {
        return /^[\x00-\x7F]*$/.test(str);
    }

    strata.clearCredentials = function () {
        strata.clearBasicAuth();
        strata.clearCookieAuth();
        authedUser = {};
    };

    strata.clearBasicAuth = function () {
        localStorage.setItem("rhAuthToken", '');
        localStorage.setItem("rhUserName", '');
        basicAuthToken = "";
    };

    strata.clearCookieAuth = function () {
        $("body").append("<iframe id='rhLogoutFrame' name='rhLogoutFrame' style='display: none;'></iframe>");
        window.open("https://" + authHostname + "/logout", "rhLogoutFrame");
    };


    //Private vars related to the connection
    baseAjaxParams = {
        accepts: {
            jsonp: 'application/json, text/json'
        },
        crossDomain: true,
        type: 'GET',
        method: 'GET',
        beforeSend: function (xhr) {
            //Include Basic Auth Credentials if available, will try SSO Cookie otherwise
            xhr.setRequestHeader('X-Omit', 'WWW-Authenticate');
            if (basicAuthToken !== null) {
                if (basicAuthToken.length !== 0) {
                    xhr.setRequestHeader('Authorization', "Basic " + basicAuthToken);
                }
            }
        },
        headers: {
            Accept: 'application/json, text/json'
        },
        xhrFields: {
            withCredentials: true
        },
        contentType: 'application/json',
        data: {},
        dataType: 'json'
    };

    authAjaxParams = $.extend({
        url: 'https://' + authHostname +
            '/services/user/status?jsoncallback=?',
        dataType: 'jsonp'
    }, baseAjaxParams);

    //Helper Functions
    //Convert Java Calendar class to something we can use
    //TODO: Make this recursive
    function convertDates(entry) {
        //Iterate over the objects for *_date
        var key;
        for (key in entry) {
            if (entry.hasOwnProperty(key)) {
                if (/[\s\S]*_date/.test(key)) {
                    //Skip indexed_date, it's not a real "Date"
                    if (key !== "indexed_date") {
                        entry[key] = new Date(entry[key]);
                    }
                }
            }
        }
    }

    function markDownToHtml(entry) {
        var html = Markdown(entry);
        return html;
    }


    //Remove empty fields from object
    //TODO: Make this recursive, so it could remove nested objs
    function removeEmpty(entry) {
        var key;
        for (key in entry) {
            if (entry.hasOwnProperty(key)) {
                //Removes anything with length 0
                if (entry[key].length === 0) {
                    delete entry[key];
                }
            }
        }
    }

    //Function to test whether we've been passed a URL or just a string/ID
    function isUrl(path) {
        return path.search(/^http/) >= 0;
    }

    //Helper classes
    //Class to describe the required Case fields
    strata.Case = function () {
        return {
            summary: "",
            description: "",
            product: "",
            version: ""
        };
    };

    //Class to describe required Case Comment fields
    strata.CaseComment = function () {
        return {
            text: "",
            public: true
        };
    };

    //Class to help create System Profiles
    strata.SystemProfile = function () {
        return {
            account_number: "",
            case_number: "",
            deprecated: false,
            //Append SystemProfileCategoryDetails Objects here
            system_profile_category: [
            ]
        };
    };

    //Helper to deal with SystemProfileCategories
    strata.SystemProfileCategoryDetails = function () {
        return {
            system_profile_category_name: "",
            system_profile_category_summary: "",
            //Append key, value pairs here
            system_profile_category_details: []
        };
    };

    //Example of fields that could be supplied to case filter
    //Fields with length 0 will be stripped out of this obj prior to being sent
    strata.CaseFilter = function () {
        var groupNumbers = [];
        return {
            //The _date objects should be real Date objs
            start_date: "",
            end_date: "",
            account_number: "",
            include_closed: false,
            include_private: false,
            keyword: "",
            group_numbers: groupNumbers,
            addGroupNumber: function (num) {
                groupNumbers.push({group_number: num});
            },
            start: 0,
            count: 50,
            only_ungrouped: false,
            owner_sso_name: "",
            product: "",
            severity: "",
            sort_field: "",
            sort_order: "",
            status: "",
            type: "",
            created_by_sso_name: "",
            resource_type: "",
            id: "",
            uri: "",
            view_uri: ""
        };
    };

    //PUBLIC METHODS
    //User provides a loginSuccess callback to handle the response
    strata.checkLogin = function (loginHandler) {
        if (!$.isFunction(loginHandler)) { throw "loginHandler callback must be supplied"; }

        checkCredentials = $.extend({}, baseAjaxParams, {
            url: strataHostname.clone().setPath('/rs/users')
                .addQueryParam('ssoUserName', authedUser.login),
            context: authedUser,
            success: function (response) {
                this.name = response.first_name + ' ' + response.last_name;
                this.is_internal = response.is_internal;
                this.org_admin = response.org_admin;
                this.has_chat = response.has_chat;
                this.session_id = response.session_id;
                this.can_add_attachments = response.can_add_attachments;
                loginHandler(true, this);
            },
            error: function () {
                strata.clearBasicAuth();
                loginHandler(false);
            }
        });

        var loginParams = $.extend({
            context: authedUser,
            success: function (response) {
                //We have an SSO Cookie, check that it's still valid
                if (response.authorized) {
                    //Copy into our private obj
                    authedUser = response;
                    //Needs to be here so authedUser.login will resolve
                    checkCredentialsNoBasic = $.extend({}, baseAjaxParams, {
                        context: authedUser,
                        url: strataHostname.clone().setPath('/rs/users')
                            .addQueryParam('ssoUserName', authedUser.login),
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader('X-Omit', 'WWW-Authenticate');
                        },
                        //We are all good
                        success: function (response) {
                            this.sso_username = response.sso_username;
                            this.name = response.first_name + ' ' + response.last_name;
                            this.is_internal = response.is_internal;
                            this.org_admin = response.org_admin;
                            this.has_chat = response.has_chat;
                            this.session_id = response.session_id;
                            this.can_add_attachments = response.can_add_attachments;
                            loginHandler(true, this);
                        },
                        //We have an SSO Cookie but it's invalid
                        error: function () {
                            strata.clearCookieAuth();
                            loginHandler(false);
                        }
                    });
                    //Check /rs/users?ssoUserName=sso-id
                    $.ajax(checkCredentialsNoBasic);
                } else {
                    strata.clearCookieAuth();
                    $.ajax(checkCredentials);
                }
            }
        }, authAjaxParams);

        //Check if we have an SSO Cookie
        $.ajax(loginParams);
    };

    //Sends data to the strata diagnostic toolchain
    strata.problems = function (data, onSuccess, onFailure, limit) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (data === undefined) { data = ""; }
        if (limit === undefined) { limit = 50; }

        var getSolutionsFromText = $.extend({}, baseAjaxParams, {
            url: strataHostname.clone().setPath('/rs/problems')
                .addQueryParam('limit', limit),
            data: data,
            type: 'POST',
            method: 'POST',
            contentType: 'text/plain',
            success: function (response) {
                if (response.source_or_link_or_problem[2] !== undefined && response.source_or_link_or_problem[2].source_or_link !== undefined) {
                    //Gets the array of solutions
                    var suggestedSolutions = response.source_or_link_or_problem[2].source_or_link;
                    onSuccess(suggestedSolutions);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(getSolutionsFromText);
    };

    //Base for solutions
    strata.solutions = {};

    //Retrieve a solution
    strata.solutions.get = function (solution, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (solution === undefined) { onFailure("solution must be defined"); }

        var url;
        if (isUrl(solution)) {
            url = new Uri(solution);
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/solutions/' + solution);
        }

        fetchSolution = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                convertDates(response);
                onSuccess(response);
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchSolution);
    };

    //Search for solutions
    strata.solutions.search = function (keyword, onSuccess, onFailure, limit, chain) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (keyword === undefined) { keyword = ""; }
        if (limit === undefined) {limit = 50; }
        if (chain === undefined) {chain = false; }

        var searchSolutions = $.extend({}, baseAjaxParams, {
            url: strataHostname.clone().setPath('/rs/solutions')
                .addQueryParam('keyword', encodeURIComponent(keyword))
                .addQueryParam('limit', limit),
            success: function (response) {
                if (chain && response.solution !== undefined) {
                    response.solution.forEach(function (entry) {
                        strata.solutions.get(entry.uri, onSuccess, onFailure);
                    });
                } else if (response.solution !== undefined) {
                    response.solution.forEach(convertDates);
                    onSuccess(response.solution);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(searchSolutions);
    };

    //Base for articles
    strata.articles = {};

    //Retrieve an article
    strata.articles.get = function (article, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (article === undefined) { onFailure("article must be defined"); }

        var url;
        if (isUrl(article)) {
            url = new Uri(article);
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/articles/' + article);
        }

        fetchArticle = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                convertDates(response);
                if (response !== undefined && response.body !== undefined && response.body.html === undefined) {
                    response.body = markDownToHtml(response.body);
                    onSuccess(response);
                }
                else if (response !== undefined && response.body !== undefined && response.body.html !== undefined) {
                    onSuccess(response);
                } else {
                    onFailure("Failed to retrieve Article " + article);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchArticle);
    };

    //Search articles
    strata.articles.search = function (keyword, onSuccess, onFailure, limit, chain) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (keyword === undefined) { keyword = ""; }
        if (limit === undefined) {limit = 50; }
        if (chain === undefined) {chain = false; }

        var url = strataHostname.clone().setPath('/rs/articles');
        url.addQueryParam('keyword', encodeURIComponent(keyword));
        url.addQueryParam('limit', limit);

        searchArticles = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (chain && response.article !== undefined) {
                    response.article.forEach(function (entry) {
                        strata.articles.get(entry.uri, onSuccess, onFailure);
                    });
                } else if (response.article !== undefined) {
                    response.article.forEach(convertDates);
                    onSuccess(response.article);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(searchArticles);
    };

    //Base for cases
    strata.cases = {};
    strata.cases.attachments = {};
    strata.cases.comments = {};
    strata.cases.notified_users = {};

    //Retrieve a case
    strata.cases.get = function (casenum, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (casenum === undefined) { onFailure("casenum must be defined"); }

        var url;
        if (isUrl(casenum)) {
            url = new Uri(casenum);
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/cases/' + casenum);
        }

        fetchCase = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (response) {
                    convertDates(response);
                    onSuccess(response);
                } else {
                    onFailure("Failed to retrieve Case: " + casenum);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchCase);
    };

    //update case comment
    strata.cases.comments.update = function (casenum, comment, commentId, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (casenum === undefined) { onFailure("casenum must be defined"); }

        var url;
        if (isUrl(casenum)) {
            url = new Uri(casenum + '/comments');
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/cases/' + casenum + '/comments/' + commentId);
        }

        fetchCaseComments = $.extend({}, baseAjaxParams, {
            url: url,
            type: 'PUT',
            method: 'PUT',
            data: JSON.stringify(comment),
            statusCode: {
                200: function(response) {
                  onSuccess();
                },
                400: onFailure
            }
        });
        $.ajax(fetchCaseComments);
    };

    //Retrieve case comments
    strata.cases.comments.get = function (casenum, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (casenum === undefined) { onFailure("casenum must be defined"); }

        var url;
        if (isUrl(casenum)) {
            url = new Uri(casenum + '/comments');
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/cases/' + casenum + '/comments');
        }

        fetchCaseComments = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (response.comment !== undefined) {
                    response.comment.forEach(convertDates);
                    onSuccess(response.comment);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchCaseComments);
    };

    //TODO: Support DRAFT comments? Only useful for internal
    //Create a new case comment
    strata.cases.comments.post = function (casenum, casecomment, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (casenum === undefined) { onFailure("casenum must be defined"); }
        if (casecomment === undefined) { onFailure("casecomment must be defined"); }

        var url;
        if (isUrl(casenum)) {
            url = new Uri(casenum + '/comments');
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/cases/' + casenum + '/comments');
        }

        createComment = $.extend({}, baseAjaxParams, {
            url: url,
            data: JSON.stringify(casecomment),
            type: 'POST',
            method: 'POST',
            success: function (response, status, xhr) {
                //Created case comment data is in the XHR
                var commentnum = xhr.getResponseHeader("Location");
                commentnum = commentnum.split("/").pop();
                onSuccess(commentnum);
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(createComment);
    };

    //List cases for the given user
    strata.cases.list = function (onSuccess, onFailure, closed) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (closed === undefined) { closed = 'false'; }

        if (!closed) {
            closed = 'false';
        }

        var url = strataHostname.clone().setPath('/rs/cases');
        url.addQueryParam('includeClosed', closed);

        fetchCases = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (response['case'] !== undefined) {
                    response['case'].forEach(convertDates);
                    onSuccess(response['case']);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchCases);
    };

    //Create a new case comment
    strata.cases.notified_users.add = function (casenum, ssoUserName, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (casenum === undefined) { onFailure("casenum must be defined"); }
        if (ssoUserName === undefined) { onFailure("ssoUserName must be defined"); }

        var url;
        if (isUrl(casenum)) {
            url = new Uri(casenum + '/notified_users');
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/cases/' + casenum + '/notified_users');
        }

        addNotifiedUser = $.extend({}, baseAjaxParams, {
            url: url,
            data: '{"user": [{"ssoUsername":"' + ssoUserName + '"}]}',
            type: 'POST',
            method: 'POST',
            headers: {
                Accept: "text/plain"
            },
            dataType: 'text',
            success: onSuccess,
            statusCode: {
                201: onSuccess,
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(addNotifiedUser);
    };

    strata.cases.notified_users.remove = function (casenum, ssoUserName, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (casenum === undefined) { onFailure("casenum must be defined"); }
        if (ssoUserName === undefined) { onFailure("ssoUserName must be defined"); }

        var url = strataHostname.clone().setPath('/rs/cases/' + casenum + '/notified_users/' + ssoUserName);

        removeNotifiedUser = $.extend({}, baseAjaxParams, {
            url: url,
            type: 'DELETE',
            method: 'DELETE',
            contentType: 'text/plain',
            headers: {
                Accept: "text/plain"
            },
            dataType: 'text',
            success: onSuccess,
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(removeNotifiedUser);
    };

    //List cases in CSV for the given user, this casues a download to occur
    strata.cases.csv = function (onSuccess, onFailure) {
        var url = strataHostname.clone().setPath('/rs/cases');

        fetchCasesCSV = $.extend({}, baseAjaxParams, {
            headers: {
                Accept: "text/csv"
            },
            url: url,
            contentType: 'text/csv',
            dataType: 'text',
            success: function(data, response, status) {
                var uri = 'data:text/csv;charset=UTF-8,' + encodeURIComponent(data);
                window.location = uri;
                onSuccess();
            },
            error: function (xhr, response, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, response, status);
            }
        });
        $.ajax(fetchCasesCSV);
    };

    //Filter cases
    strata.cases.filter = function (casefilter, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (casefilter === undefined) { onFailure("casefilter must be defined"); }

        var url = strataHostname.clone().setPath('/rs/cases/filter');

        //Remove any 0 length fields
        removeEmpty(casefilter);

        filterCases = $.extend({}, baseAjaxParams, {
            url: url,
            data: JSON.stringify(casefilter),
            type: 'POST',
            method: 'POST',
            success: function (response) {
                if (response['case'] !== undefined) {
                    response['case'].forEach(convertDates);
                    onSuccess(response['case']);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(filterCases);
    };

    //Create a new case
    strata.cases.post = function (casedata, onSuccess, onFailure) {
        //Default parameter value
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (casedata === undefined) { onFailure("casedata must be defined"); }

        var url = strataHostname.clone().setPath('/rs/cases');

        createAttachment = $.extend({}, baseAjaxParams, {
            url: url,
            data: JSON.stringify(casedata),
            type: 'POST',
            method: 'POST',
            success: function (response, status, xhr) {
                //Created case data is in the XHR
                var casenum = xhr.getResponseHeader("Location");
                casenum = casenum.split("/").pop();
                onSuccess(casenum);
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(createAttachment);
    };

    //Update a case
    strata.cases.put = function (casenum, casedata, onSuccess, onFailure) {
        //Default parameter value
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (casenum === undefined) { onFailure("casenum must be defined"); }
        if (casedata === undefined) { onFailure("casedata must be defined"); }

        var url;
        if (isUrl(casenum)) {
            url = new Uri(casenum);
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/cases/' + casenum);
        }

        var successCallback = function() {
          onSuccess();
        };

        updateCase = $.extend({}, baseAjaxParams, {
            url: url,
            data: JSON.stringify(casedata),
            type: 'PUT',
            method: 'PUT',
            statusCode: {
                200: successCallback,
                202: successCallback,
                400: onFailure
            },
            success: function (response) {
                onSuccess(response);
            }
        });
        $.ajax(updateCase);
    };


    //List case attachments
    strata.cases.attachments.list = function (casenum, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (casenum === undefined) { onFailure("casenum must be defined"); }

        var url;
        if (isUrl(casenum)) {
            url = new Uri(casenum + '/attachments');
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/cases/' + casenum + '/attachments');
        }

        listCaseAttachments = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (response.attachment === undefined) {
                    onSuccess([]);
                } else {
                    response.attachment.forEach(convertDates);
                    onSuccess(response.attachment);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(listCaseAttachments);
    };

    //POST an attachment
    //data MUST be MULTIPART/FORM-DATA
    strata.cases.attachments.post = function (data, casenum, onSuccess, onFailure) {
        //Default parameter value
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (data === undefined) { onFailure("data must be defined"); }
        if (casenum === undefined) { onFailure("casenum must be defined"); }

        var url;
        if (isUrl(casenum)) {
            url = new Uri(casenum + '/attachments');
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/cases/' + casenum + '/attachments');
        }

        createAttachment = $.extend({}, baseAjaxParams, {
            url: url,
            data: data,
            type: 'POST',
            method: 'POST',
            processData: false,
            contentType: false,
            cache: false,
            success: onSuccess,
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(createAttachment);
    };

    strata.cases.attachments.remove = function (attachmentId, casenum, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (attachmentId === undefined) { onFailure("attachmentId must be defined"); }
        if (casenum === undefined) { onFailure("casenum must be defined"); }

        var url =
            strataHostname.clone().setPath(
                '/rs/cases/' + casenum + '/attachments/' + attachmentId
            );
        deleteAttachment = $.extend({}, baseAjaxParams, {
            url: url,
            type: 'DELETE',
            method: 'DELETE',
            success: onSuccess,
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(deleteAttachment);
    };

    //Base for symptoms
    strata.symptoms = {};

    //Symptom Extractor
    strata.symptoms.extractor = function (data, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (data === undefined) { onFailure("data must be defined"); }

        var url = strataHostname.clone().setPath('/rs/symptoms/extractor');

        getSymptomsFromText = $.extend({}, baseAjaxParams, {
            url: url,
            data: data,
            type: 'POST',
            method: 'POST',
            contentType: 'text/plain',
            success: function (response) {
                if (response.extracted_symptom !== undefined) {
                    onSuccess(response.extracted_symptom);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(getSymptomsFromText);
    };

    //Base for groups
    strata.groups = {};

    //List groups for this user
    strata.groups.list = function (onSuccess, onFailure, ssoUserName) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }

        if (ssoUserName === undefined) {
            var url = strataHostname.clone().setPath('/rs/groups');
        } else {
            var url = strataHostname.clone().setPath('/rs/groups/contact/' + ssoUserName);
        }

        listGroups = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (response.group !== undefined) {
                    onSuccess(response.group);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(listGroups);
    };

    //Create a group
    strata.groups.create = function (groupName, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (groupName === undefined) { onFailure("groupName must be defined"); }

        var url = strataHostname.clone().setPath('/rs/groups');
        url.addQueryParam(redhatClient, redhatClientID);

        var throwError = function(xhr, response, status) {
            onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, response, status);
        };

        createGroup = $.extend({}, baseAjaxParams, {
            url: url,
            type: 'POST',
            method: 'POST',
            data: '{"name": "' + groupName + '"}',
            success: onSuccess,
            statusCode: {
                201: function(response) {
                    var locationHeader = response.getResponseHeader('Location');
                    var groupNumber =
                        locationHeader.slice(locationHeader.lastIndexOf('/') + 1);
                    onSuccess(groupNumber);
                },
                400: throwError,
                500: throwError
            }
        });
        $.ajax(createGroup);
    };

    //Delete a group
    strata.groups.remove = function (groupnum, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (groupnum === undefined) { onFailure("groupnum must be defined"); }

        var url = strataHostname.clone().setPath('/rs/groups/' + groupnum);
        url.addQueryParam(redhatClient, redhatClientID);

        var throwError = function(xhr, response, status) {
            onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, response, status);
        };

        deleteGroup = $.extend({}, baseAjaxParams, {
            url: url,
            type: 'DELETE',
            method: 'DELETE',
            success: onSuccess,
            statusCode: {
                200: function(response) {
                    onSuccess();
                },
                400: throwError,
                500: throwError
            }
        });
        $.ajax(deleteGroup);
    };

    //Retrieve a group
    strata.groups.get = function (groupnum, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (groupnum === undefined) { onFailure("groupnum must be defined"); }

        var url;
        if (isUrl(groupnum)) {
            url = new Uri(groupnum);
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/groups/' + groupnum);
        }

        fetchGroup = $.extend({}, baseAjaxParams, {
            url: url,
            success: onSuccess,
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchGroup);
    };

    //Base for products
    strata.products = {};

    //List products for this user
    strata.products.list = function (onSuccess, onFailure, ssoUserName) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }

        if (ssoUserName === undefined) {
            var url = strataHostname.clone().setPath('/rs/products');
        } else {
            var url = strataHostname.clone().setPath('/rs/products/contact/' + ssoUserName);
        }


        listProducts = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (response.product !== undefined) {
                    onSuccess(response.product);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(listProducts);
    };

    //Retrieve a product
    strata.products.get = function (code, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (code === undefined) { onFailure("code must be defined"); }

        var url;
        if (isUrl(code)) {
            url = new Uri(code);
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/products/' + code);
        }

        fetchProduct = $.extend({}, baseAjaxParams, {
            url: url,
            success: onSuccess,
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchProduct);
    };

    //Retrieve versions for a product
    strata.products.versions = function (code, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (code === undefined) { onFailure("code must be defined"); }

        var url;
        if (isUrl(code)) {
            url = new Uri(code + '/versions');
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/products/' + code + '/versions');
        }

        fetchProductVersions = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (response.version !== undefined) {
                    onSuccess(response.version);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchProductVersions);
    };

    //Base for values
    strata.values = {};
    strata.values.cases = {};

    //Retrieve the case types
    strata.values.cases.types = function (onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }

        var url = strataHostname.clone().setPath('/rs/values/case/types');

        caseTypes = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (response.value !== undefined) {
                    onSuccess(response.value);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(caseTypes);
    };

    //Retrieve the case severities
    strata.values.cases.severity = function (onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }

        var url = strataHostname.clone().setPath('/rs/values/case/severity');

        caseSeverities = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (response.value !== undefined) {
                    onSuccess(response.value);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(caseSeverities);
    };

    //Retrieve the case statuses
    strata.values.cases.status = function (onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }

        var url = strataHostname.clone().setPath('/rs/values/case/status');

        caseStatus = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (response.value !== undefined) {
                    onSuccess(response.value);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(caseStatus);
    };

    //Base for System Profiles
    strata.systemProfiles = {};

    //List system profiles
    strata.systemProfiles.list = function (onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }

        var url = strataHostname.clone().setPath('/rs/system_profiles');

        fetchSystemProfiles = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (response.system_profile !== undefined) {
                    onSuccess(response.system_profile);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchSystemProfiles);
    };

    //Get a specific system_profile, either by hash or casenum
    //Case can return an array, hash will return a single result
    strata.systemProfiles.get = function (casenum, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (casenum === undefined) { onFailure("casenum must be defined"); }

        var url;
        if (isUrl(casenum)) {
            url = new Uri(casenum);
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/system_profiles/' + casenum);
        }

        fetchSystemProfile = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if ($.isArray(response.system_profile)) {
                    onSuccess(response.system_profile);
                } else {
                    onSuccess(response);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchSystemProfile);
    };
    //TODO: Create helper class to Handle list + filtering

    //Create a new System Profile
    strata.systemProfiles.post = function (systemprofile, onSuccess, onFailure) {
        //Default parameter value
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (systemprofile === undefined) { onFailure("systemprofile must be defined"); }

        var url = strataHostname.clone().setPath('/rs/system_profiles');

        createSystemProfile = $.extend({}, baseAjaxParams, {
            url: url,
            data: JSON.stringify(systemprofile),
            type: 'POST',
            method: 'POST',
            success: function (response, status, xhr) {
                //Created case data is in the XHR
                var hash = xhr.getResponseHeader("Location");
                hash = hash.split("/").pop();
                onSuccess(hash);
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(createSystemProfile);
    };

    strata.accounts = {};

    //List Accounts for the given user
    strata.accounts.list = function (onSuccess, onFailure, closed) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (closed === undefined) { closed = false; }

        var url = strataHostname.clone().setPath('/rs/accounts');

        fetchAccounts = $.extend({}, baseAjaxParams, {
            url: url,
            success:  onSuccess,
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchAccounts);
    };

    //Get an Account
    strata.accounts.get = function (accountnum, onSuccess, onFailure) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (accountnum === undefined) { onFailure("accountnum must be defined"); }

        var url;
        if (isUrl(accountnum)) {
            url = new Uri(accountnum);
            url.addQueryParam(redhatClient, redhatClientID);
        } else {
            url = strataHostname.clone().setPath('/rs/accounts/' + accountnum);
        }

        fetchAccount = $.extend({}, baseAjaxParams, {
            url: url,
            success: onSuccess,
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchAccount);
    };

    //Get an Accounts Users
    strata.accounts.users = function (accountnum, onSuccess, onFailure, group) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (accountnum === undefined) { onFailure("accountnum must be defined"); }

        var url;
        if (isUrl(accountnum)) {
            url = new Uri(accountnum);
            url.addQueryParam(redhatClient, redhatClientID);
        } else if (group === undefined) {
            url = strataHostname.clone().setPath('/rs/accounts/' + accountnum + "/users");
        } else {
            url = strataHostname.clone()
                .setPath('/rs/accounts/' + accountnum + "/groups/" + group + "/users");
        }

        fetchAccountUsers = $.extend({}, baseAjaxParams, {
            url: url,
            success: function (response) {
                if (response.user !== undefined) {
                    onSuccess(response.user);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchAccountUsers);
    };

    strata.entitlements = {};
    strata.entitlements.get = function (showAll, onSuccess, onFailure, ssoUserName) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }

        if (ssoUserName === undefined) {
            var url = strataHostname.clone().setPath('/rs/entitlements?showAll=' + showAll.toString());
        } else {
            var url = strataHostname.clone().setPath('/rs/entitlements/contact/' + ssoUserName + '?showAll=' + showAll.toString());
        }

        fetchEntitlements = $.extend({}, baseAjaxParams, {
            url: url,
            success: onSuccess,
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchEntitlements);
    };

    //Helper function to "diagnose" text, chains problems and solutions calls
    //This will call 'onSuccess' for each solution
    strata.diagnose = function (data, onSuccess, onFailure, limit) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (data === undefined) { onFailure("data must be defined"); }
        if (limit === undefined) { limit = 50; }

        //Call problems, send that list to get solutions to get each one
        strata.problems(data, function (response) {
            response.forEach(function (entry) {
                strata.solutions.get(entry.uri, onSuccess, onFailure);
            });
        }, onFailure, limit);
    };

    strata.search = function (keyword, onSuccess, onFailure, limit, chain) {
        if (!$.isFunction(onSuccess)) { throw "onSuccess callback must be a function"; }
        if (!$.isFunction(onFailure)) { throw "onFailure callback must be a function"; }
        if (keyword === undefined) { keyword = ""; }
        if (limit === undefined) {limit = 50; }
        if (chain === undefined) {chain = false; }

        var searchStrata = $.extend({}, baseAjaxParams, {
            url: strataHostname.clone().setPath('/rs/search')
                .addQueryParam('keyword', encodeURIComponent(keyword))
                .addQueryParam('contentType', 'article,solution')
                .addQueryParam('limit', limit),
            success: function (response) {
                if (chain && response.search_result !== undefined) {
                    response.search_result.forEach(function (entry) {
                        strata.utils.getURI(entry.uri, entry.resource_type, onSuccess, onFailure);
                    });
                } else if (response.search_result !== undefined) {
                    onSuccess(response.search_result);
                } else {
                    onSuccess([]);
                }
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(searchStrata);
    };

    strata.utils = {};

    //Get selected text from the browser, this should work on
    //Chrome and FF.  Have not tested anything else
    strata.utils.getSelectedText = function () {
        var t = '';
        if (window.getSelection) {
            t = window.getSelection();
        } else if (document.getSelection) {
            t = document.getSelection();
        } else if (document.selection) {
            t = document.selection.createRange().text;
        }
        return t.toString();
    };

    strata.utils.getURI = function (uri, resourceType, onSuccess, onFailure) {
        fetchURI = $.extend({}, baseAjaxParams, {
            url: uri,
            success: function (response) {
                convertDates(response);
                onSuccess(resourceType, response);
            },
            error: function (xhr, reponse, status) {
                onFailure("Error " + xhr.status + " " + xhr.statusText, xhr, reponse, status);
            }
        });
        $.ajax(fetchURI);
    };

    return strata;
}));

/**
 * @license AngularJS v1.2.1
 * (c) 2010-2012 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function(window, angular, undefined) {'use strict';

var $resourceMinErr = angular.$$minErr('$resource');

// Helper functions and regex to lookup a dotted path on an object
// stopping at undefined/null.  The path must be composed of ASCII
// identifiers (just like $parse)
var MEMBER_NAME_REGEX = /^(\.[a-zA-Z_$][0-9a-zA-Z_$]*)+$/;

function isValidDottedPath(path) {
  return (path != null && path !== '' && path !== 'hasOwnProperty' &&
      MEMBER_NAME_REGEX.test('.' + path));
}

function lookupDottedPath(obj, path) {
  if (!isValidDottedPath(path)) {
    throw $resourceMinErr('badmember', 'Dotted member path "@{0}" is invalid.', path);
  }
  var keys = path.split('.');
  for (var i = 0, ii = keys.length; i < ii && obj !== undefined; i++) {
    var key = keys[i];
    obj = (obj !== null) ? obj[key] : undefined;
  }
  return obj;
}

/**
 * @ngdoc overview
 * @name ngResource
 * @description
 *
 * # ngResource
 *
 * The `ngResource` module provides interaction support with RESTful services
 * via the $resource service.
 *
 * {@installModule resource}
 *
 * <div doc-module-components="ngResource"></div>
 *
 * See {@link ngResource.$resource `$resource`} for usage.
 */

/**
 * @ngdoc object
 * @name ngResource.$resource
 * @requires $http
 *
 * @description
 * A factory which creates a resource object that lets you interact with
 * [RESTful](http://en.wikipedia.org/wiki/Representational_State_Transfer) server-side data sources.
 *
 * The returned resource object has action methods which provide high-level behaviors without
 * the need to interact with the low level {@link ng.$http $http} service.
 *
 * Requires the {@link ngResource `ngResource`} module to be installed.
 *
 * @param {string} url A parametrized URL template with parameters prefixed by `:` as in
 *   `/user/:username`. If you are using a URL with a port number (e.g.
 *   `http://example.com:8080/api`), it will be respected.
 *
 *   If you are using a url with a suffix, just add the suffix, like this:
 *   `$resource('http://example.com/resource.json')` or `$resource('http://example.com/:id.json')`
 *   or even `$resource('http://example.com/resource/:resource_id.:format')`
 *   If the parameter before the suffix is empty, :resource_id in this case, then the `/.` will be
 *   collapsed down to a single `.`.  If you need this sequence to appear and not collapse then you
 *   can escape it with `/\.`.
 *
 * @param {Object=} paramDefaults Default values for `url` parameters. These can be overridden in
 *   `actions` methods. If any of the parameter value is a function, it will be executed every time
 *   when a param value needs to be obtained for a request (unless the param was overridden).
 *
 *   Each key value in the parameter object is first bound to url template if present and then any
 *   excess keys are appended to the url search query after the `?`.
 *
 *   Given a template `/path/:verb` and parameter `{verb:'greet', salutation:'Hello'}` results in
 *   URL `/path/greet?salutation=Hello`.
 *
 *   If the parameter value is prefixed with `@` then the value of that parameter is extracted from
 *   the data object (useful for non-GET operations).
 *
 * @param {Object.<Object>=} actions Hash with declaration of custom action that should extend the
 *   default set of resource actions. The declaration should be created in the format of {@link
 *   ng.$http#usage_parameters $http.config}:
 *
 *       {action1: {method:?, params:?, isArray:?, headers:?, ...},
 *        action2: {method:?, params:?, isArray:?, headers:?, ...},
 *        ...}
 *
 *   Where:
 *
 *   - **`action`** – {string} – The name of action. This name becomes the name of the method on
 *     your resource object.
 *   - **`method`** – {string} – HTTP request method. Valid methods are: `GET`, `POST`, `PUT`,
 *     `DELETE`, and `JSONP`.
 *   - **`params`** – {Object=} – Optional set of pre-bound parameters for this action. If any of
 *     the parameter value is a function, it will be executed every time when a param value needs to
 *     be obtained for a request (unless the param was overridden).
 *   - **`url`** – {string} – action specific `url` override. The url templating is supported just
 *     like for the resource-level urls.
 *   - **`isArray`** – {boolean=} – If true then the returned object for this action is an array,
 *     see `returns` section.
 *   - **`transformRequest`** –
 *     `{function(data, headersGetter)|Array.<function(data, headersGetter)>}` –
 *     transform function or an array of such functions. The transform function takes the http
 *     request body and headers and returns its transformed (typically serialized) version.
 *   - **`transformResponse`** –
 *     `{function(data, headersGetter)|Array.<function(data, headersGetter)>}` –
 *     transform function or an array of such functions. The transform function takes the http
 *     response body and headers and returns its transformed (typically deserialized) version.
 *   - **`cache`** – `{boolean|Cache}` – If true, a default $http cache will be used to cache the
 *     GET request, otherwise if a cache instance built with
 *     {@link ng.$cacheFactory $cacheFactory}, this cache will be used for
 *     caching.
 *   - **`timeout`** – `{number|Promise}` – timeout in milliseconds, or {@link ng.$q promise} that
 *     should abort the request when resolved.
 *   - **`withCredentials`** - `{boolean}` - whether to set the `withCredentials` flag on the
 *     XHR object. See {@link https://developer.mozilla.org/en/http_access_control#section_5
 *     requests with credentials} for more information.
 *   - **`responseType`** - `{string}` - see {@link
 *     https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#responseType requestType}.
 *   - **`interceptor`** - `{Object=}` - The interceptor object has two optional methods -
 *     `response` and `responseError`. Both `response` and `responseError` interceptors get called
 *     with `http response` object. See {@link ng.$http $http interceptors}.
 *
 * @returns {Object} A resource "class" object with methods for the default set of resource actions
 *   optionally extended with custom `actions`. The default set contains these actions:
 *
 *       { 'get':    {method:'GET'},
 *         'save':   {method:'POST'},
 *         'query':  {method:'GET', isArray:true},
 *         'remove': {method:'DELETE'},
 *         'delete': {method:'DELETE'} };
 *
 *   Calling these methods invoke an {@link ng.$http} with the specified http method,
 *   destination and parameters. When the data is returned from the server then the object is an
 *   instance of the resource class. The actions `save`, `remove` and `delete` are available on it
 *   as  methods with the `$` prefix. This allows you to easily perform CRUD operations (create,
 *   read, update, delete) on server-side data like this:
 *   <pre>
        var User = $resource('/user/:userId', {userId:'@id'});
        var user = User.get({userId:123}, function() {
          user.abc = true;
          user.$save();
        });
     </pre>
 *
 *   It is important to realize that invoking a $resource object method immediately returns an
 *   empty reference (object or array depending on `isArray`). Once the data is returned from the
 *   server the existing reference is populated with the actual data. This is a useful trick since
 *   usually the resource is assigned to a model which is then rendered by the view. Having an empty
 *   object results in no rendering, once the data arrives from the server then the object is
 *   populated with the data and the view automatically re-renders itself showing the new data. This
 *   means that in most cases one never has to write a callback function for the action methods.
 *
 *   The action methods on the class object or instance object can be invoked with the following
 *   parameters:
 *
 *   - HTTP GET "class" actions: `Resource.action([parameters], [success], [error])`
 *   - non-GET "class" actions: `Resource.action([parameters], postData, [success], [error])`
 *   - non-GET instance actions:  `instance.$action([parameters], [success], [error])`
 *
 *   Success callback is called with (value, responseHeaders) arguments. Error callback is called
 *   with (httpResponse) argument.
 *
 *   Class actions return empty instance (with additional properties below).
 *   Instance actions return promise of the action.
 *
 *   The Resource instances and collection have these additional properties:
 *
 *   - `$promise`: the {@link ng.$q promise} of the original server interaction that created this
 *     instance or collection.
 *
 *     On success, the promise is resolved with the same resource instance or collection object,
 *     updated with data from server. This makes it easy to use in
 *     {@link ngRoute.$routeProvider resolve section of $routeProvider.when()} to defer view
 *     rendering until the resource(s) are loaded.
 *
 *     On failure, the promise is resolved with the {@link ng.$http http response} object, without
 *     the `resource` property.
 *
 *   - `$resolved`: `true` after first server interaction is completed (either with success or
 *      rejection), `false` before that. Knowing if the Resource has been resolved is useful in
 *      data-binding.
 *
 * @example
 *
 * # Credit card resource
 *
 * <pre>
     // Define CreditCard class
     var CreditCard = $resource('/user/:userId/card/:cardId',
      {userId:123, cardId:'@id'}, {
       charge: {method:'POST', params:{charge:true}}
      });

     // We can retrieve a collection from the server
     var cards = CreditCard.query(function() {
       // GET: /user/123/card
       // server returns: [ {id:456, number:'1234', name:'Smith'} ];

       var card = cards[0];
       // each item is an instance of CreditCard
       expect(card instanceof CreditCard).toEqual(true);
       card.name = "J. Smith";
       // non GET methods are mapped onto the instances
       card.$save();
       // POST: /user/123/card/456 {id:456, number:'1234', name:'J. Smith'}
       // server returns: {id:456, number:'1234', name: 'J. Smith'};

       // our custom method is mapped as well.
       card.$charge({amount:9.99});
       // POST: /user/123/card/456?amount=9.99&charge=true {id:456, number:'1234', name:'J. Smith'}
     });

     // we can create an instance as well
     var newCard = new CreditCard({number:'0123'});
     newCard.name = "Mike Smith";
     newCard.$save();
     // POST: /user/123/card {number:'0123', name:'Mike Smith'}
     // server returns: {id:789, number:'01234', name: 'Mike Smith'};
     expect(newCard.id).toEqual(789);
 * </pre>
 *
 * The object returned from this function execution is a resource "class" which has "static" method
 * for each action in the definition.
 *
 * Calling these methods invoke `$http` on the `url` template with the given `method`, `params` and
 * `headers`.
 * When the data is returned from the server then the object is an instance of the resource type and
 * all of the non-GET methods are available with `$` prefix. This allows you to easily support CRUD
 * operations (create, read, update, delete) on server-side data.

   <pre>
     var User = $resource('/user/:userId', {userId:'@id'});
     var user = User.get({userId:123}, function() {
       user.abc = true;
       user.$save();
     });
   </pre>
 *
 * It's worth noting that the success callback for `get`, `query` and other methods gets passed
 * in the response that came from the server as well as $http header getter function, so one
 * could rewrite the above example and get access to http headers as:
 *
   <pre>
     var User = $resource('/user/:userId', {userId:'@id'});
     User.get({userId:123}, function(u, getResponseHeaders){
       u.abc = true;
       u.$save(function(u, putResponseHeaders) {
         //u => saved user object
         //putResponseHeaders => $http header getter
       });
     });
   </pre>
 */
angular.module('ngResource', ['ng']).
  factory('$resource', ['$http', '$q', function($http, $q) {

    var DEFAULT_ACTIONS = {
      'get':    {method:'GET'},
      'save':   {method:'POST'},
      'query':  {method:'GET', isArray:true},
      'remove': {method:'DELETE'},
      'delete': {method:'DELETE'}
    };
    var noop = angular.noop,
        forEach = angular.forEach,
        extend = angular.extend,
        copy = angular.copy,
        isFunction = angular.isFunction;

    /**
     * We need our custom method because encodeURIComponent is too aggressive and doesn't follow
     * http://www.ietf.org/rfc/rfc3986.txt with regards to the character set (pchar) allowed in path
     * segments:
     *    segment       = *pchar
     *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
     *    pct-encoded   = "%" HEXDIG HEXDIG
     *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
     *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
     *                     / "*" / "+" / "," / ";" / "="
     */
    function encodeUriSegment(val) {
      return encodeUriQuery(val, true).
        replace(/%26/gi, '&').
        replace(/%3D/gi, '=').
        replace(/%2B/gi, '+');
    }


    /**
     * This method is intended for encoding *key* or *value* parts of query component. We need a
     * custom method because encodeURIComponent is too aggressive and encodes stuff that doesn't
     * have to be encoded per http://tools.ietf.org/html/rfc3986:
     *    query       = *( pchar / "/" / "?" )
     *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
     *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
     *    pct-encoded   = "%" HEXDIG HEXDIG
     *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
     *                     / "*" / "+" / "," / ";" / "="
     */
    function encodeUriQuery(val, pctEncodeSpaces) {
      return encodeURIComponent(val).
        replace(/%40/gi, '@').
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
    }

    function Route(template, defaults) {
      this.template = template;
      this.defaults = defaults || {};
      this.urlParams = {};
    }

    Route.prototype = {
      setUrlParams: function(config, params, actionUrl) {
        var self = this,
            url = actionUrl || self.template,
            val,
            encodedVal;

        var urlParams = self.urlParams = {};
        forEach(url.split(/\W/), function(param){
          if (param === 'hasOwnProperty') {
            throw $resourceMinErr('badname', "hasOwnProperty is not a valid parameter name.");
          }
          if (!(new RegExp("^\\d+$").test(param)) && param &&
               (new RegExp("(^|[^\\\\]):" + param + "(\\W|$)").test(url))) {
            urlParams[param] = true;
          }
        });
        url = url.replace(/\\:/g, ':');

        params = params || {};
        forEach(self.urlParams, function(_, urlParam){
          val = params.hasOwnProperty(urlParam) ? params[urlParam] : self.defaults[urlParam];
          if (angular.isDefined(val) && val !== null) {
            encodedVal = encodeUriSegment(val);
            url = url.replace(new RegExp(":" + urlParam + "(\\W|$)", "g"), encodedVal + "$1");
          } else {
            url = url.replace(new RegExp("(\/?):" + urlParam + "(\\W|$)", "g"), function(match,
                leadingSlashes, tail) {
              if (tail.charAt(0) == '/') {
                return tail;
              } else {
                return leadingSlashes + tail;
              }
            });
          }
        });

        // strip trailing slashes and set the url
        url = url.replace(/\/+$/, '');
        // then replace collapse `/.` if found in the last URL path segment before the query
        // E.g. `http://url.com/id./format?q=x` becomes `http://url.com/id.format?q=x`
        url = url.replace(/\/\.(?=\w+($|\?))/, '.');
        // replace escaped `/\.` with `/.`
        config.url = url.replace(/\/\\\./, '/.');


        // set params - delegate param encoding to $http
        forEach(params, function(value, key){
          if (!self.urlParams[key]) {
            config.params = config.params || {};
            config.params[key] = value;
          }
        });
      }
    };


    function resourceFactory(url, paramDefaults, actions) {
      var route = new Route(url);

      actions = extend({}, DEFAULT_ACTIONS, actions);

      function extractParams(data, actionParams){
        var ids = {};
        actionParams = extend({}, paramDefaults, actionParams);
        forEach(actionParams, function(value, key){
          if (isFunction(value)) { value = value(); }
          ids[key] = value && value.charAt && value.charAt(0) == '@' ?
            lookupDottedPath(data, value.substr(1)) : value;
        });
        return ids;
      }

      function defaultResponseInterceptor(response) {
        return response.resource;
      }

      function Resource(value){
        copy(value || {}, this);
      }

      forEach(actions, function(action, name) {
        var hasBody = /^(POST|PUT|PATCH)$/i.test(action.method);

        Resource[name] = function(a1, a2, a3, a4) {
          var params = {}, data, success, error;

          /* jshint -W086 */ /* (purposefully fall through case statements) */
          switch(arguments.length) {
          case 4:
            error = a4;
            success = a3;
            //fallthrough
          case 3:
          case 2:
            if (isFunction(a2)) {
              if (isFunction(a1)) {
                success = a1;
                error = a2;
                break;
              }

              success = a2;
              error = a3;
              //fallthrough
            } else {
              params = a1;
              data = a2;
              success = a3;
              break;
            }
          case 1:
            if (isFunction(a1)) success = a1;
            else if (hasBody) data = a1;
            else params = a1;
            break;
          case 0: break;
          default:
            throw $resourceMinErr('badargs',
              "Expected up to 4 arguments [params, data, success, error], got {0} arguments",
              arguments.length);
          }
          /* jshint +W086 */ /* (purposefully fall through case statements) */

          var isInstanceCall = data instanceof Resource;
          var value = isInstanceCall ? data : (action.isArray ? [] : new Resource(data));
          var httpConfig = {};
          var responseInterceptor = action.interceptor && action.interceptor.response ||
                                    defaultResponseInterceptor;
          var responseErrorInterceptor = action.interceptor && action.interceptor.responseError ||
                                    undefined;

          forEach(action, function(value, key) {
            if (key != 'params' && key != 'isArray' && key != 'interceptor') {
              httpConfig[key] = copy(value);
            }
          });

          if (hasBody) httpConfig.data = data;
          route.setUrlParams(httpConfig,
                             extend({}, extractParams(data, action.params || {}), params),
                             action.url);

          var promise = $http(httpConfig).then(function(response) {
            var data = response.data,
                promise = value.$promise;

            if (data) {
              // Need to convert action.isArray to boolean in case it is undefined
              // jshint -W018
              if ( angular.isArray(data) !== (!!action.isArray) ) {
                throw $resourceMinErr('badcfg', 'Error in resource configuration. Expected ' +
                  'response to contain an {0} but got an {1}',
                  action.isArray?'array':'object', angular.isArray(data)?'array':'object');
              }
              // jshint +W018
              if (action.isArray) {
                value.length = 0;
                forEach(data, function(item) {
                  value.push(new Resource(item));
                });
              } else {
                copy(data, value);
                value.$promise = promise;
              }
            }

            value.$resolved = true;

            response.resource = value;

            return response;
          }, function(response) {
            value.$resolved = true;

            (error||noop)(response);

            return $q.reject(response);
          });

          promise = promise.then(
              function(response) {
                var value = responseInterceptor(response);
                (success||noop)(value, response.headers);
                return value;
              },
              responseErrorInterceptor);

          if (!isInstanceCall) {
            // we are creating instance / collection
            // - set the initial promise
            // - return the instance / collection
            value.$promise = promise;
            value.$resolved = false;

            return value;
          }

          // instance call
          return promise;
        };


        Resource.prototype['$' + name] = function(params, success, error) {
          if (isFunction(params)) {
            error = success; success = params; params = {};
          }
          var result = Resource[name](params, this, success, error);
          return result.$promise || result;
        };
      });

      Resource.bind = function(additionalParamDefaults){
        return resourceFactory(url, extend({}, paramDefaults, additionalParamDefaults), actions);
      };

      return Resource;
    }

    return resourceFactory;
  }]);


})(window, window.angular);

/**
 * @license AngularJS v1.2.1
 * (c) 2010-2012 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function(window, angular, undefined) {'use strict';

var $sanitizeMinErr = angular.$$minErr('$sanitize');

/**
 * @ngdoc overview
 * @name ngSanitize
 * @description
 *
 * # ngSanitize
 *
 * The `ngSanitize` module provides functionality to sanitize HTML.
 *
 * {@installModule sanitize}
 *
 * <div doc-module-components="ngSanitize"></div>
 *
 * See {@link ngSanitize.$sanitize `$sanitize`} for usage.
 */

/*
 * HTML Parser By Misko Hevery (misko@hevery.com)
 * based on:  HTML Parser By John Resig (ejohn.org)
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
 * // Use like so:
 * htmlParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 */


/**
 * @ngdoc service
 * @name ngSanitize.$sanitize
 * @function
 *
 * @description
 *   The input is sanitized by parsing the html into tokens. All safe tokens (from a whitelist) are
 *   then serialized back to properly escaped html string. This means that no unsafe input can make
 *   it into the returned string, however, since our parser is more strict than a typical browser
 *   parser, it's possible that some obscure input, which would be recognized as valid HTML by a
 *   browser, won't make it through the sanitizer.
 *
 * @param {string} html Html input.
 * @returns {string} Sanitized html.
 *
 * @example
   <doc:example module="ngSanitize">
   <doc:source>
     <script>
       function Ctrl($scope, $sce) {
         $scope.snippet =
           '<p style="color:blue">an html\n' +
           '<em onmouseover="this.textContent=\'PWN3D!\'">click here</em>\n' +
           'snippet</p>';
         $scope.deliberatelyTrustDangerousSnippet = function() {
           return $sce.trustAsHtml($scope.snippet);
         };
       }
     </script>
     <div ng-controller="Ctrl">
        Snippet: <textarea ng-model="snippet" cols="60" rows="3"></textarea>
       <table>
         <tr>
           <td>Directive</td>
           <td>How</td>
           <td>Source</td>
           <td>Rendered</td>
         </tr>
         <tr id="bind-html-with-sanitize">
           <td>ng-bind-html</td>
           <td>Automatically uses $sanitize</td>
           <td><pre>&lt;div ng-bind-html="snippet"&gt;<br/>&lt;/div&gt;</pre></td>
           <td><div ng-bind-html="snippet"></div></td>
         </tr>
         <tr id="bind-html-with-trust">
           <td>ng-bind-html</td>
           <td>Bypass $sanitize by explicitly trusting the dangerous value</td>
           <td>
           <pre>&lt;div ng-bind-html="deliberatelyTrustDangerousSnippet()"&gt;
&lt;/div&gt;</pre>
           </td>
           <td><div ng-bind-html="deliberatelyTrustDangerousSnippet()"></div></td>
         </tr>
         <tr id="bind-default">
           <td>ng-bind</td>
           <td>Automatically escapes</td>
           <td><pre>&lt;div ng-bind="snippet"&gt;<br/>&lt;/div&gt;</pre></td>
           <td><div ng-bind="snippet"></div></td>
         </tr>
       </table>
       </div>
   </doc:source>
   <doc:scenario>
     it('should sanitize the html snippet by default', function() {
       expect(using('#bind-html-with-sanitize').element('div').html()).
         toBe('<p>an html\n<em>click here</em>\nsnippet</p>');
     });

     it('should inline raw snippet if bound to a trusted value', function() {
       expect(using('#bind-html-with-trust').element("div").html()).
         toBe("<p style=\"color:blue\">an html\n" +
              "<em onmouseover=\"this.textContent='PWN3D!'\">click here</em>\n" +
              "snippet</p>");
     });

     it('should escape snippet without any filter', function() {
       expect(using('#bind-default').element('div').html()).
         toBe("&lt;p style=\"color:blue\"&gt;an html\n" +
              "&lt;em onmouseover=\"this.textContent='PWN3D!'\"&gt;click here&lt;/em&gt;\n" +
              "snippet&lt;/p&gt;");
     });

     it('should update', function() {
       input('snippet').enter('new <b onclick="alert(1)">text</b>');
       expect(using('#bind-html-with-sanitize').element('div').html()).toBe('new <b>text</b>');
       expect(using('#bind-html-with-trust').element('div').html()).toBe(
         'new <b onclick="alert(1)">text</b>');
       expect(using('#bind-default').element('div').html()).toBe(
         "new &lt;b onclick=\"alert(1)\"&gt;text&lt;/b&gt;");
     });
   </doc:scenario>
   </doc:example>
 */
var $sanitize = function(html) {
  var buf = [];
    htmlParser(html, htmlSanitizeWriter(buf));
    return buf.join('');
};


// Regular Expressions for parsing tags and attributes
var START_TAG_REGEXP =
       /^<\s*([\w:-]+)((?:\s+[\w:-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)\s*>/,
  END_TAG_REGEXP = /^<\s*\/\s*([\w:-]+)[^>]*>/,
  ATTR_REGEXP = /([\w:-]+)(?:\s*=\s*(?:(?:"((?:[^"])*)")|(?:'((?:[^'])*)')|([^>\s]+)))?/g,
  BEGIN_TAG_REGEXP = /^</,
  BEGING_END_TAGE_REGEXP = /^<\s*\//,
  COMMENT_REGEXP = /<!--(.*?)-->/g,
  DOCTYPE_REGEXP = /<!DOCTYPE([^>]*?)>/i,
  CDATA_REGEXP = /<!\[CDATA\[(.*?)]]>/g,
  URI_REGEXP = /^((ftp|https?):\/\/|mailto:|tel:|#)/i,
  // Match everything outside of normal chars and " (quote character)
  NON_ALPHANUMERIC_REGEXP = /([^\#-~| |!])/g;


// Good source of info about elements and attributes
// http://dev.w3.org/html5/spec/Overview.html#semantics
// http://simon.html5.org/html-elements

// Safe Void Elements - HTML5
// http://dev.w3.org/html5/spec/Overview.html#void-elements
var voidElements = makeMap("area,br,col,hr,img,wbr");

// Elements that you can, intentionally, leave open (and which close themselves)
// http://dev.w3.org/html5/spec/Overview.html#optional-tags
var optionalEndTagBlockElements = makeMap("colgroup,dd,dt,li,p,tbody,td,tfoot,th,thead,tr"),
    optionalEndTagInlineElements = makeMap("rp,rt"),
    optionalEndTagElements = angular.extend({},
                                            optionalEndTagInlineElements,
                                            optionalEndTagBlockElements);

// Safe Block Elements - HTML5
var blockElements = angular.extend({}, optionalEndTagBlockElements, makeMap("address,article," +
        "aside,blockquote,caption,center,del,dir,div,dl,figure,figcaption,footer,h1,h2,h3,h4,h5," +
        "h6,header,hgroup,hr,ins,map,menu,nav,ol,pre,script,section,table,ul"));

// Inline Elements - HTML5
var inlineElements = angular.extend({}, optionalEndTagInlineElements, makeMap("a,abbr,acronym,b," +
        "bdi,bdo,big,br,cite,code,del,dfn,em,font,i,img,ins,kbd,label,map,mark,q,ruby,rp,rt,s," +
        "samp,small,span,strike,strong,sub,sup,time,tt,u,var"));


// Special Elements (can contain anything)
var specialElements = makeMap("script,style");

var validElements = angular.extend({},
                                   voidElements,
                                   blockElements,
                                   inlineElements,
                                   optionalEndTagElements);

//Attributes that have href and hence need to be sanitized
var uriAttrs = makeMap("background,cite,href,longdesc,src,usemap");
var validAttrs = angular.extend({}, uriAttrs, makeMap(
    'abbr,align,alt,axis,bgcolor,border,cellpadding,cellspacing,class,clear,'+
    'color,cols,colspan,compact,coords,dir,face,headers,height,hreflang,hspace,'+
    'ismap,lang,language,nohref,nowrap,rel,rev,rows,rowspan,rules,'+
    'scope,scrolling,shape,span,start,summary,target,title,type,'+
    'valign,value,vspace,width'));

function makeMap(str) {
  var obj = {}, items = str.split(','), i;
  for (i = 0; i < items.length; i++) obj[items[i]] = true;
  return obj;
}


/**
 * @example
 * htmlParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * @param {string} html string
 * @param {object} handler
 */
function htmlParser( html, handler ) {
  var index, chars, match, stack = [], last = html;
  stack.last = function() { return stack[ stack.length - 1 ]; };

  while ( html ) {
    chars = true;

    // Make sure we're not in a script or style element
    if ( !stack.last() || !specialElements[ stack.last() ] ) {

      // Comment
      if ( html.indexOf("<!--") === 0 ) {
        // comments containing -- are not allowed unless they terminate the comment
        index = html.indexOf("--", 4);

        if ( index >= 0 && html.lastIndexOf("-->", index) === index) {
          if (handler.comment) handler.comment( html.substring( 4, index ) );
          html = html.substring( index + 3 );
          chars = false;
        }
      // DOCTYPE
      } else if ( DOCTYPE_REGEXP.test(html) ) {
        match = html.match( DOCTYPE_REGEXP );

        if ( match ) {
          html = html.replace( match[0] , '');
          chars = false;
        }
      // end tag
      } else if ( BEGING_END_TAGE_REGEXP.test(html) ) {
        match = html.match( END_TAG_REGEXP );

        if ( match ) {
          html = html.substring( match[0].length );
          match[0].replace( END_TAG_REGEXP, parseEndTag );
          chars = false;
        }

      // start tag
      } else if ( BEGIN_TAG_REGEXP.test(html) ) {
        match = html.match( START_TAG_REGEXP );

        if ( match ) {
          html = html.substring( match[0].length );
          match[0].replace( START_TAG_REGEXP, parseStartTag );
          chars = false;
        }
      }

      if ( chars ) {
        index = html.indexOf("<");

        var text = index < 0 ? html : html.substring( 0, index );
        html = index < 0 ? "" : html.substring( index );

        if (handler.chars) handler.chars( decodeEntities(text) );
      }

    } else {
      html = html.replace(new RegExp("(.*)<\\s*\\/\\s*" + stack.last() + "[^>]*>", 'i'),
        function(all, text){
          text = text.replace(COMMENT_REGEXP, "$1").replace(CDATA_REGEXP, "$1");

          if (handler.chars) handler.chars( decodeEntities(text) );

          return "";
      });

      parseEndTag( "", stack.last() );
    }

    if ( html == last ) {
      throw $sanitizeMinErr('badparse', "The sanitizer was unable to parse the following block " +
                                        "of html: {0}", html);
    }
    last = html;
  }

  // Clean up any remaining tags
  parseEndTag();

  function parseStartTag( tag, tagName, rest, unary ) {
    tagName = angular.lowercase(tagName);
    if ( blockElements[ tagName ] ) {
      while ( stack.last() && inlineElements[ stack.last() ] ) {
        parseEndTag( "", stack.last() );
      }
    }

    if ( optionalEndTagElements[ tagName ] && stack.last() == tagName ) {
      parseEndTag( "", tagName );
    }

    unary = voidElements[ tagName ] || !!unary;

    if ( !unary )
      stack.push( tagName );

    var attrs = {};

    rest.replace(ATTR_REGEXP,
      function(match, name, doubleQuotedValue, singleQuotedValue, unquotedValue) {
        var value = doubleQuotedValue
          || singleQuotedValue
          || unquotedValue
          || '';

        attrs[name] = decodeEntities(value);
    });
    if (handler.start) handler.start( tagName, attrs, unary );
  }

  function parseEndTag( tag, tagName ) {
    var pos = 0, i;
    tagName = angular.lowercase(tagName);
    if ( tagName )
      // Find the closest opened tag of the same type
      for ( pos = stack.length - 1; pos >= 0; pos-- )
        if ( stack[ pos ] == tagName )
          break;

    if ( pos >= 0 ) {
      // Close all the open elements, up the stack
      for ( i = stack.length - 1; i >= pos; i-- )
        if (handler.end) handler.end( stack[ i ] );

      // Remove the open elements from the stack
      stack.length = pos;
    }
  }
}

/**
 * decodes all entities into regular string
 * @param value
 * @returns {string} A string with decoded entities.
 */
var hiddenPre=document.createElement("pre");
function decodeEntities(value) {
  hiddenPre.innerHTML=value.replace(/</g,"&lt;");
  return hiddenPre.innerText || hiddenPre.textContent || '';
}

/**
 * Escapes all potentially dangerous characters, so that the
 * resulting string can be safely inserted into attribute or
 * element text.
 * @param value
 * @returns escaped text
 */
function encodeEntities(value) {
  return value.
    replace(/&/g, '&amp;').
    replace(NON_ALPHANUMERIC_REGEXP, function(value){
      return '&#' + value.charCodeAt(0) + ';';
    }).
    replace(/</g, '&lt;').
    replace(/>/g, '&gt;');
}

/**
 * create an HTML/XML writer which writes to buffer
 * @param {Array} buf use buf.jain('') to get out sanitized html string
 * @returns {object} in the form of {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * }
 */
function htmlSanitizeWriter(buf){
  var ignore = false;
  var out = angular.bind(buf, buf.push);
  return {
    start: function(tag, attrs, unary){
      tag = angular.lowercase(tag);
      if (!ignore && specialElements[tag]) {
        ignore = tag;
      }
      if (!ignore && validElements[tag] === true) {
        out('<');
        out(tag);
        angular.forEach(attrs, function(value, key){
          var lkey=angular.lowercase(key);
          if (validAttrs[lkey]===true && (uriAttrs[lkey]!==true || value.match(URI_REGEXP))) {
            out(' ');
            out(key);
            out('="');
            out(encodeEntities(value));
            out('"');
          }
        });
        out(unary ? '/>' : '>');
      }
    },
    end: function(tag){
        tag = angular.lowercase(tag);
        if (!ignore && validElements[tag] === true) {
          out('</');
          out(tag);
          out('>');
        }
        if (tag == ignore) {
          ignore = false;
        }
      },
    chars: function(chars){
        if (!ignore) {
          out(encodeEntities(chars));
        }
      }
  };
}


// define ngSanitize module and register $sanitize service
angular.module('ngSanitize', []).value('$sanitize', $sanitize);

/* global htmlSanitizeWriter: false */

/**
 * @ngdoc filter
 * @name ngSanitize.filter:linky
 * @function
 *
 * @description
 * Finds links in text input and turns them into html links. Supports http/https/ftp/mailto and
 * plain email address links.
 *
 * Requires the {@link ngSanitize `ngSanitize`} module to be installed.
 *
 * @param {string} text Input text.
 * @param {string} target Window (_blank|_self|_parent|_top) or named frame to open links in.
 * @returns {string} Html-linkified text.
 *
 * @usage
   <span ng-bind-html="linky_expression | linky"></span>
 *
 * @example
   <doc:example module="ngSanitize">
     <doc:source>
       <script>
         function Ctrl($scope) {
           $scope.snippet =
             'Pretty text with some links:\n'+
             'http://angularjs.org/,\n'+
             'mailto:us@somewhere.org,\n'+
             'another@somewhere.org,\n'+
             'and one more: ftp://127.0.0.1/.';
           $scope.snippetWithTarget = 'http://angularjs.org/';
         }
       </script>
       <div ng-controller="Ctrl">
       Snippet: <textarea ng-model="snippet" cols="60" rows="3"></textarea>
       <table>
         <tr>
           <td>Filter</td>
           <td>Source</td>
           <td>Rendered</td>
         </tr>
         <tr id="linky-filter">
           <td>linky filter</td>
           <td>
             <pre>&lt;div ng-bind-html="snippet | linky"&gt;<br>&lt;/div&gt;</pre>
           </td>
           <td>
             <div ng-bind-html="snippet | linky"></div>
           </td>
         </tr>
         <tr id="linky-target">
          <td>linky target</td>
          <td>
            <pre>&lt;div ng-bind-html="snippetWithTarget | linky:'_blank'"&gt;<br>&lt;/div&gt;</pre>
          </td>
          <td>
            <div ng-bind-html="snippetWithTarget | linky:'_blank'"></div>
          </td>
         </tr>
         <tr id="escaped-html">
           <td>no filter</td>
           <td><pre>&lt;div ng-bind="snippet"&gt;<br>&lt;/div&gt;</pre></td>
           <td><div ng-bind="snippet"></div></td>
         </tr>
       </table>
     </doc:source>
     <doc:scenario>
       it('should linkify the snippet with urls', function() {
         expect(using('#linky-filter').binding('snippet | linky')).
           toBe('Pretty text with some links:&#10;' +
                '<a href="http://angularjs.org/">http://angularjs.org/</a>,&#10;' +
                '<a href="mailto:us@somewhere.org">us@somewhere.org</a>,&#10;' +
                '<a href="mailto:another@somewhere.org">another@somewhere.org</a>,&#10;' +
                'and one more: <a href="ftp://127.0.0.1/">ftp://127.0.0.1/</a>.');
       });

       it ('should not linkify snippet without the linky filter', function() {
         expect(using('#escaped-html').binding('snippet')).
           toBe("Pretty text with some links:\n" +
                "http://angularjs.org/,\n" +
                "mailto:us@somewhere.org,\n" +
                "another@somewhere.org,\n" +
                "and one more: ftp://127.0.0.1/.");
       });

       it('should update', function() {
         input('snippet').enter('new http://link.');
         expect(using('#linky-filter').binding('snippet | linky')).
           toBe('new <a href="http://link">http://link</a>.');
         expect(using('#escaped-html').binding('snippet')).toBe('new http://link.');
       });

       it('should work with the target property', function() {
        expect(using('#linky-target').binding("snippetWithTarget | linky:'_blank'")).
          toBe('<a target="_blank" href="http://angularjs.org/">http://angularjs.org/</a>');
       });
     </doc:scenario>
   </doc:example>
 */
angular.module('ngSanitize').filter('linky', function() {
  var LINKY_URL_REGEXP =
        /((ftp|https?):\/\/|(mailto:)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>]/,
      MAILTO_REGEXP = /^mailto:/;

  return function(text, target) {
    if (!text) return text;
    var match;
    var raw = text;
    var html = [];
    // TODO(vojta): use $sanitize instead
    var writer = htmlSanitizeWriter(html);
    var url;
    var i;
    var properties = {};
    if (angular.isDefined(target)) {
      properties.target = target;
    }
    while ((match = raw.match(LINKY_URL_REGEXP))) {
      // We can not end in these as they are sometimes found at the end of the sentence
      url = match[0];
      // if we did not match ftp/http/mailto then assume mailto
      if (match[2] == match[3]) url = 'mailto:' + url;
      i = match.index;
      writer.chars(raw.substr(0, i));
      properties.href = url;
      writer.start('a', properties);
      writer.chars(match[0].replace(MAILTO_REGEXP, ''));
      writer.end('a');
      raw = raw.substring(i + match[0].length);
    }
    writer.chars(raw);
    return html.join('');
  };
});


})(window, window.angular);

/**
 * @license AngularJS v1.2.1
 * (c) 2010-2012 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function(window, angular, undefined) {'use strict';

/**
 * @ngdoc overview
 * @name ngRoute
 * @description
 *
 * # ngRoute
 *
 * The `ngRoute` module provides routing and deeplinking services and directives for angular apps.
 *
 * {@installModule route}
 *
 * <div doc-module-components="ngRoute"></div>
 */
 /* global -ngRouteModule */
var ngRouteModule = angular.module('ngRoute', ['ng']).
                        provider('$route', $RouteProvider);

/**
 * @ngdoc object
 * @name ngRoute.$routeProvider
 * @function
 *
 * @description
 *
 * Used for configuring routes. See {@link ngRoute.$route $route} for an example.
 *
 * Requires the {@link ngRoute `ngRoute`} module to be installed.
 */
function $RouteProvider(){
  function inherit(parent, extra) {
    return angular.extend(new (angular.extend(function() {}, {prototype:parent}))(), extra);
  }

  var routes = {};

  /**
   * @ngdoc method
   * @name ngRoute.$routeProvider#when
   * @methodOf ngRoute.$routeProvider
   *
   * @param {string} path Route path (matched against `$location.path`). If `$location.path`
   *    contains redundant trailing slash or is missing one, the route will still match and the
   *    `$location.path` will be updated to add or drop the trailing slash to exactly match the
   *    route definition.
   *
   *      * `path` can contain named groups starting with a colon (`:name`). All characters up
   *        to the next slash are matched and stored in `$routeParams` under the given `name`
   *        when the route matches.
   *      * `path` can contain named groups starting with a colon and ending with a star (`:name*`).
   *        All characters are eagerly stored in `$routeParams` under the given `name`
   *        when the route matches.
   *      * `path` can contain optional named groups with a question mark (`:name?`).
   *
   *    For example, routes like `/color/:color/largecode/:largecode*\/edit` will match
   *    `/color/brown/largecode/code/with/slashs/edit` and extract:
   *
   *      * `color: brown`
   *      * `largecode: code/with/slashs`.
   *
   *
   * @param {Object} route Mapping information to be assigned to `$route.current` on route
   *    match.
   *
   *    Object properties:
   *
   *    - `controller` – `{(string|function()=}` – Controller fn that should be associated with
   *      newly created scope or the name of a {@link angular.Module#controller registered
   *      controller} if passed as a string.
   *    - `controllerAs` – `{string=}` – A controller alias name. If present the controller will be
   *      published to scope under the `controllerAs` name.
   *    - `template` – `{string=|function()=}` – html template as a string or a function that
   *      returns an html template as a string which should be used by {@link
   *      ngRoute.directive:ngView ngView} or {@link ng.directive:ngInclude ngInclude} directives.
   *      This property takes precedence over `templateUrl`.
   *
   *      If `template` is a function, it will be called with the following parameters:
   *
   *      - `{Array.<Object>}` - route parameters extracted from the current
   *        `$location.path()` by applying the current route
   *
   *    - `templateUrl` – `{string=|function()=}` – path or function that returns a path to an html
   *      template that should be used by {@link ngRoute.directive:ngView ngView}.
   *
   *      If `templateUrl` is a function, it will be called with the following parameters:
   *
   *      - `{Array.<Object>}` - route parameters extracted from the current
   *        `$location.path()` by applying the current route
   *
   *    - `resolve` - `{Object.<string, function>=}` - An optional map of dependencies which should
   *      be injected into the controller. If any of these dependencies are promises, the router
   *      will wait for them all to be resolved or one to be rejected before the controller is
   *      instantiated.
   *      If all the promises are resolved successfully, the values of the resolved promises are
   *      injected and {@link ngRoute.$route#$routeChangeSuccess $routeChangeSuccess} event is
   *      fired. If any of the promises are rejected the
   *      {@link ngRoute.$route#$routeChangeError $routeChangeError} event is fired. The map object
   *      is:
   *
   *      - `key` – `{string}`: a name of a dependency to be injected into the controller.
   *      - `factory` - `{string|function}`: If `string` then it is an alias for a service.
   *        Otherwise if function, then it is {@link api/AUTO.$injector#invoke injected}
   *        and the return value is treated as the dependency. If the result is a promise, it is
   *        resolved before its value is injected into the controller. Be aware that
   *        `ngRoute.$routeParams` will still refer to the previous route within these resolve
   *        functions.  Use `$route.current.params` to access the new route parameters, instead.
   *
   *    - `redirectTo` – {(string|function())=} – value to update
   *      {@link ng.$location $location} path with and trigger route redirection.
   *
   *      If `redirectTo` is a function, it will be called with the following parameters:
   *
   *      - `{Object.<string>}` - route parameters extracted from the current
   *        `$location.path()` by applying the current route templateUrl.
   *      - `{string}` - current `$location.path()`
   *      - `{Object}` - current `$location.search()`
   *
   *      The custom `redirectTo` function is expected to return a string which will be used
   *      to update `$location.path()` and `$location.search()`.
   *
   *    - `[reloadOnSearch=true]` - {boolean=} - reload route when only `$location.search()`
   *      or `$location.hash()` changes.
   *
   *      If the option is set to `false` and url in the browser changes, then
   *      `$routeUpdate` event is broadcasted on the root scope.
   *
   *    - `[caseInsensitiveMatch=false]` - {boolean=} - match routes without being case sensitive
   *
   *      If the option is set to `true`, then the particular route can be matched without being
   *      case sensitive
   *
   * @returns {Object} self
   *
   * @description
   * Adds a new route definition to the `$route` service.
   */
  this.when = function(path, route) {
    routes[path] = angular.extend(
      {reloadOnSearch: true},
      route,
      path && pathRegExp(path, route)
    );

    // create redirection for trailing slashes
    if (path) {
      var redirectPath = (path[path.length-1] == '/')
            ? path.substr(0, path.length-1)
            : path +'/';

      routes[redirectPath] = angular.extend(
        {redirectTo: path},
        pathRegExp(redirectPath, route)
      );
    }

    return this;
  };

   /**
    * @param path {string} path
    * @param opts {Object} options
    * @return {?Object}
    *
    * @description
    * Normalizes the given path, returning a regular expression
    * and the original path.
    *
    * Inspired by pathRexp in visionmedia/express/lib/utils.js.
    */
  function pathRegExp(path, opts) {
    var insensitive = opts.caseInsensitiveMatch,
        ret = {
          originalPath: path,
          regexp: path
        },
        keys = ret.keys = [];

    path = path
      .replace(/([().])/g, '\\$1')
      .replace(/(\/)?:(\w+)([\?|\*])?/g, function(_, slash, key, option){
        var optional = option === '?' ? option : null;
        var star = option === '*' ? option : null;
        keys.push({ name: key, optional: !!optional });
        slash = slash || '';
        return ''
          + (optional ? '' : slash)
          + '(?:'
          + (optional ? slash : '')
          + (star && '(.+?)' || '([^/]+)')
          + (optional || '')
          + ')'
          + (optional || '');
      })
      .replace(/([\/$\*])/g, '\\$1');

    ret.regexp = new RegExp('^' + path + '$', insensitive ? 'i' : '');
    return ret;
  }

  /**
   * @ngdoc method
   * @name ngRoute.$routeProvider#otherwise
   * @methodOf ngRoute.$routeProvider
   *
   * @description
   * Sets route definition that will be used on route change when no other route definition
   * is matched.
   *
   * @param {Object} params Mapping information to be assigned to `$route.current`.
   * @returns {Object} self
   */
  this.otherwise = function(params) {
    this.when(null, params);
    return this;
  };


  this.$get = ['$rootScope',
               '$location',
               '$routeParams',
               '$q',
               '$injector',
               '$http',
               '$templateCache',
               '$sce',
      function($rootScope, $location, $routeParams, $q, $injector, $http, $templateCache, $sce) {

    /**
     * @ngdoc object
     * @name ngRoute.$route
     * @requires $location
     * @requires $routeParams
     *
     * @property {Object} current Reference to the current route definition.
     * The route definition contains:
     *
     *   - `controller`: The controller constructor as define in route definition.
     *   - `locals`: A map of locals which is used by {@link ng.$controller $controller} service for
     *     controller instantiation. The `locals` contain
     *     the resolved values of the `resolve` map. Additionally the `locals` also contain:
     *
     *     - `$scope` - The current route scope.
     *     - `$template` - The current route template HTML.
     *
     * @property {Array.<Object>} routes Array of all configured routes.
     *
     * @description
     * `$route` is used for deep-linking URLs to controllers and views (HTML partials).
     * It watches `$location.url()` and tries to map the path to an existing route definition.
     *
     * Requires the {@link ngRoute `ngRoute`} module to be installed.
     *
     * You can define routes through {@link ngRoute.$routeProvider $routeProvider}'s API.
     *
     * The `$route` service is typically used in conjunction with the
     * {@link ngRoute.directive:ngView `ngView`} directive and the
     * {@link ngRoute.$routeParams `$routeParams`} service.
     *
     * @example
       This example shows how changing the URL hash causes the `$route` to match a route against the
       URL, and the `ngView` pulls in the partial.

       Note that this example is using {@link ng.directive:script inlined templates}
       to get it working on jsfiddle as well.

     <example module="ngViewExample" deps="angular-route.js">
       <file name="index.html">
         <div ng-controller="MainCntl">
           Choose:
           <a href="Book/Moby">Moby</a> |
           <a href="Book/Moby/ch/1">Moby: Ch1</a> |
           <a href="Book/Gatsby">Gatsby</a> |
           <a href="Book/Gatsby/ch/4?key=value">Gatsby: Ch4</a> |
           <a href="Book/Scarlet">Scarlet Letter</a><br/>

           <div ng-view></div>
           <hr />

           <pre>$location.path() = {{$location.path()}}</pre>
           <pre>$route.current.templateUrl = {{$route.current.templateUrl}}</pre>
           <pre>$route.current.params = {{$route.current.params}}</pre>
           <pre>$route.current.scope.name = {{$route.current.scope.name}}</pre>
           <pre>$routeParams = {{$routeParams}}</pre>
         </div>
       </file>

       <file name="book.html">
         controller: {{name}}<br />
         Book Id: {{params.bookId}}<br />
       </file>

       <file name="chapter.html">
         controller: {{name}}<br />
         Book Id: {{params.bookId}}<br />
         Chapter Id: {{params.chapterId}}
       </file>

       <file name="script.js">
         angular.module('ngViewExample', ['ngRoute'])

         .config(function($routeProvider, $locationProvider) {
           $routeProvider.when('/Book/:bookId', {
             templateUrl: 'book.html',
             controller: BookCntl,
             resolve: {
               // I will cause a 1 second delay
               delay: function($q, $timeout) {
                 var delay = $q.defer();
                 $timeout(delay.resolve, 1000);
                 return delay.promise;
               }
             }
           });
           $routeProvider.when('/Book/:bookId/ch/:chapterId', {
             templateUrl: 'chapter.html',
             controller: ChapterCntl
           });

           // configure html5 to get links working on jsfiddle
           $locationProvider.html5Mode(true);
         });

         function MainCntl($scope, $route, $routeParams, $location) {
           $scope.$route = $route;
           $scope.$location = $location;
           $scope.$routeParams = $routeParams;
         }

         function BookCntl($scope, $routeParams) {
           $scope.name = "BookCntl";
           $scope.params = $routeParams;
         }

         function ChapterCntl($scope, $routeParams) {
           $scope.name = "ChapterCntl";
           $scope.params = $routeParams;
         }
       </file>

       <file name="scenario.js">
         it('should load and compile correct template', function() {
           element('a:contains("Moby: Ch1")').click();
           var content = element('.doc-example-live [ng-view]').text();
           expect(content).toMatch(/controller\: ChapterCntl/);
           expect(content).toMatch(/Book Id\: Moby/);
           expect(content).toMatch(/Chapter Id\: 1/);

           element('a:contains("Scarlet")').click();
           sleep(2); // promises are not part of scenario waiting
           content = element('.doc-example-live [ng-view]').text();
           expect(content).toMatch(/controller\: BookCntl/);
           expect(content).toMatch(/Book Id\: Scarlet/);
         });
       </file>
     </example>
     */

    /**
     * @ngdoc event
     * @name ngRoute.$route#$routeChangeStart
     * @eventOf ngRoute.$route
     * @eventType broadcast on root scope
     * @description
     * Broadcasted before a route change. At this  point the route services starts
     * resolving all of the dependencies needed for the route change to occurs.
     * Typically this involves fetching the view template as well as any dependencies
     * defined in `resolve` route property. Once  all of the dependencies are resolved
     * `$routeChangeSuccess` is fired.
     *
     * @param {Object} angularEvent Synthetic event object.
     * @param {Route} next Future route information.
     * @param {Route} current Current route information.
     */

    /**
     * @ngdoc event
     * @name ngRoute.$route#$routeChangeSuccess
     * @eventOf ngRoute.$route
     * @eventType broadcast on root scope
     * @description
     * Broadcasted after a route dependencies are resolved.
     * {@link ngRoute.directive:ngView ngView} listens for the directive
     * to instantiate the controller and render the view.
     *
     * @param {Object} angularEvent Synthetic event object.
     * @param {Route} current Current route information.
     * @param {Route|Undefined} previous Previous route information, or undefined if current is
     * first route entered.
     */

    /**
     * @ngdoc event
     * @name ngRoute.$route#$routeChangeError
     * @eventOf ngRoute.$route
     * @eventType broadcast on root scope
     * @description
     * Broadcasted if any of the resolve promises are rejected.
     *
     * @param {Object} angularEvent Synthetic event object
     * @param {Route} current Current route information.
     * @param {Route} previous Previous route information.
     * @param {Route} rejection Rejection of the promise. Usually the error of the failed promise.
     */

    /**
     * @ngdoc event
     * @name ngRoute.$route#$routeUpdate
     * @eventOf ngRoute.$route
     * @eventType broadcast on root scope
     * @description
     *
     * The `reloadOnSearch` property has been set to false, and we are reusing the same
     * instance of the Controller.
     */

    var forceReload = false,
        $route = {
          routes: routes,

          /**
           * @ngdoc method
           * @name ngRoute.$route#reload
           * @methodOf ngRoute.$route
           *
           * @description
           * Causes `$route` service to reload the current route even if
           * {@link ng.$location $location} hasn't changed.
           *
           * As a result of that, {@link ngRoute.directive:ngView ngView}
           * creates new scope, reinstantiates the controller.
           */
          reload: function() {
            forceReload = true;
            $rootScope.$evalAsync(updateRoute);
          }
        };

    $rootScope.$on('$locationChangeSuccess', updateRoute);

    return $route;

    /////////////////////////////////////////////////////

    /**
     * @param on {string} current url
     * @param route {Object} route regexp to match the url against
     * @return {?Object}
     *
     * @description
     * Check if the route matches the current url.
     *
     * Inspired by match in
     * visionmedia/express/lib/router/router.js.
     */
    function switchRouteMatcher(on, route) {
      var keys = route.keys,
          params = {};

      if (!route.regexp) return null;

      var m = route.regexp.exec(on);
      if (!m) return null;

      for (var i = 1, len = m.length; i < len; ++i) {
        var key = keys[i - 1];

        var val = 'string' == typeof m[i]
              ? decodeURIComponent(m[i])
              : m[i];

        if (key && val) {
          params[key.name] = val;
        }
      }
      return params;
    }

    function updateRoute() {
      var next = parseRoute(),
          last = $route.current;

      if (next && last && next.$$route === last.$$route
          && angular.equals(next.pathParams, last.pathParams)
          && !next.reloadOnSearch && !forceReload) {
        last.params = next.params;
        angular.copy(last.params, $routeParams);
        $rootScope.$broadcast('$routeUpdate', last);
      } else if (next || last) {
        forceReload = false;
        $rootScope.$broadcast('$routeChangeStart', next, last);
        $route.current = next;
        if (next) {
          if (next.redirectTo) {
            if (angular.isString(next.redirectTo)) {
              $location.path(interpolate(next.redirectTo, next.params)).search(next.params)
                       .replace();
            } else {
              $location.url(next.redirectTo(next.pathParams, $location.path(), $location.search()))
                       .replace();
            }
          }
        }

        $q.when(next).
          then(function() {
            if (next) {
              var locals = angular.extend({}, next.resolve),
                  template, templateUrl;

              angular.forEach(locals, function(value, key) {
                locals[key] = angular.isString(value) ?
                    $injector.get(value) : $injector.invoke(value);
              });

              if (angular.isDefined(template = next.template)) {
                if (angular.isFunction(template)) {
                  template = template(next.params);
                }
              } else if (angular.isDefined(templateUrl = next.templateUrl)) {
                if (angular.isFunction(templateUrl)) {
                  templateUrl = templateUrl(next.params);
                }
                templateUrl = $sce.getTrustedResourceUrl(templateUrl);
                if (angular.isDefined(templateUrl)) {
                  next.loadedTemplateUrl = templateUrl;
                  template = $http.get(templateUrl, {cache: $templateCache}).
                      then(function(response) { return response.data; });
                }
              }
              if (angular.isDefined(template)) {
                locals['$template'] = template;
              }
              return $q.all(locals);
            }
          }).
          // after route change
          then(function(locals) {
            if (next == $route.current) {
              if (next) {
                next.locals = locals;
                angular.copy(next.params, $routeParams);
              }
              $rootScope.$broadcast('$routeChangeSuccess', next, last);
            }
          }, function(error) {
            if (next == $route.current) {
              $rootScope.$broadcast('$routeChangeError', next, last, error);
            }
          });
      }
    }


    /**
     * @returns the current active route, by matching it against the URL
     */
    function parseRoute() {
      // Match a route
      var params, match;
      angular.forEach(routes, function(route, path) {
        if (!match && (params = switchRouteMatcher($location.path(), route))) {
          match = inherit(route, {
            params: angular.extend({}, $location.search(), params),
            pathParams: params});
          match.$$route = route;
        }
      });
      // No route matched; fallback to "otherwise" route
      return match || routes[null] && inherit(routes[null], {params: {}, pathParams:{}});
    }

    /**
     * @returns interpolation of the redirect path with the parameters
     */
    function interpolate(string, params) {
      var result = [];
      angular.forEach((string||'').split(':'), function(segment, i) {
        if (i === 0) {
          result.push(segment);
        } else {
          var segmentMatch = segment.match(/(\w+)(.*)/);
          var key = segmentMatch[1];
          result.push(params[key]);
          result.push(segmentMatch[2] || '');
          delete params[key];
        }
      });
      return result.join('');
    }
  }];
}

ngRouteModule.provider('$routeParams', $RouteParamsProvider);


/**
 * @ngdoc object
 * @name ngRoute.$routeParams
 * @requires $route
 *
 * @description
 * The `$routeParams` service allows you to retrieve the current set of route parameters.
 *
 * Requires the {@link ngRoute `ngRoute`} module to be installed.
 *
 * The route parameters are a combination of {@link ng.$location `$location`}'s
 * {@link ng.$location#methods_search `search()`} and {@link ng.$location#methods_path `path()`}.
 * The `path` parameters are extracted when the {@link ngRoute.$route `$route`} path is matched.
 *
 * In case of parameter name collision, `path` params take precedence over `search` params.
 *
 * The service guarantees that the identity of the `$routeParams` object will remain unchanged
 * (but its properties will likely change) even when a route change occurs.
 *
 * Note that the `$routeParams` are only updated *after* a route change completes successfully.
 * This means that you cannot rely on `$routeParams` being correct in route resolve functions.
 * Instead you can use `$route.current.params` to access the new route's parameters.
 *
 * @example
 * <pre>
 *  // Given:
 *  // URL: http://server.com/index.html#/Chapter/1/Section/2?search=moby
 *  // Route: /Chapter/:chapterId/Section/:sectionId
 *  //
 *  // Then
 *  $routeParams ==> {chapterId:1, sectionId:2, search:'moby'}
 * </pre>
 */
function $RouteParamsProvider() {
  this.$get = function() { return {}; };
}

ngRouteModule.directive('ngView', ngViewFactory);

/**
 * @ngdoc directive
 * @name ngRoute.directive:ngView
 * @restrict ECA
 *
 * @description
 * # Overview
 * `ngView` is a directive that complements the {@link ngRoute.$route $route} service by
 * including the rendered template of the current route into the main layout (`index.html`) file.
 * Every time the current route changes, the included view changes with it according to the
 * configuration of the `$route` service.
 *
 * Requires the {@link ngRoute `ngRoute`} module to be installed.
 *
 * @animations
 * enter - animation is used to bring new content into the browser.
 * leave - animation is used to animate existing content away.
 *
 * The enter and leave animation occur concurrently.
 *
 * @scope
 * @priority 400
 * @example
    <example module="ngViewExample" deps="angular-route.js" animations="true">
      <file name="index.html">
        <div ng-controller="MainCntl as main">
          Choose:
          <a href="Book/Moby">Moby</a> |
          <a href="Book/Moby/ch/1">Moby: Ch1</a> |
          <a href="Book/Gatsby">Gatsby</a> |
          <a href="Book/Gatsby/ch/4?key=value">Gatsby: Ch4</a> |
          <a href="Book/Scarlet">Scarlet Letter</a><br/>

          <div class="view-animate-container">
            <div ng-view class="view-animate"></div>
          </div>
          <hr />

          <pre>$location.path() = {{main.$location.path()}}</pre>
          <pre>$route.current.templateUrl = {{main.$route.current.templateUrl}}</pre>
          <pre>$route.current.params = {{main.$route.current.params}}</pre>
          <pre>$route.current.scope.name = {{main.$route.current.scope.name}}</pre>
          <pre>$routeParams = {{main.$routeParams}}</pre>
        </div>
      </file>

      <file name="book.html">
        <div>
          controller: {{book.name}}<br />
          Book Id: {{book.params.bookId}}<br />
        </div>
      </file>

      <file name="chapter.html">
        <div>
          controller: {{chapter.name}}<br />
          Book Id: {{chapter.params.bookId}}<br />
          Chapter Id: {{chapter.params.chapterId}}
        </div>
      </file>

      <file name="animations.css">
        .view-animate-container {
          position:relative;
          height:100px!important;
          position:relative;
          background:white;
          border:1px solid black;
          height:40px;
          overflow:hidden;
        }

        .view-animate {
          padding:10px;
        }

        .view-animate.ng-enter, .view-animate.ng-leave {
          -webkit-transition:all cubic-bezier(0.250, 0.460, 0.450, 0.940) 1.5s;
          transition:all cubic-bezier(0.250, 0.460, 0.450, 0.940) 1.5s;

          display:block;
          width:100%;
          border-left:1px solid black;

          position:absolute;
          top:0;
          left:0;
          right:0;
          bottom:0;
          padding:10px;
        }

        .view-animate.ng-enter {
          left:100%;
        }
        .view-animate.ng-enter.ng-enter-active {
          left:0;
        }
        .view-animate.ng-leave.ng-leave-active {
          left:-100%;
        }
      </file>

      <file name="script.js">
        angular.module('ngViewExample', ['ngRoute', 'ngAnimate'],
          function($routeProvider, $locationProvider) {
            $routeProvider.when('/Book/:bookId', {
              templateUrl: 'book.html',
              controller: BookCntl,
              controllerAs: 'book'
            });
            $routeProvider.when('/Book/:bookId/ch/:chapterId', {
              templateUrl: 'chapter.html',
              controller: ChapterCntl,
              controllerAs: 'chapter'
            });

            // configure html5 to get links working on jsfiddle
            $locationProvider.html5Mode(true);
        });

        function MainCntl($route, $routeParams, $location) {
          this.$route = $route;
          this.$location = $location;
          this.$routeParams = $routeParams;
        }

        function BookCntl($routeParams) {
          this.name = "BookCntl";
          this.params = $routeParams;
        }

        function ChapterCntl($routeParams) {
          this.name = "ChapterCntl";
          this.params = $routeParams;
        }
      </file>

      <file name="scenario.js">
        it('should load and compile correct template', function() {
          element('a:contains("Moby: Ch1")').click();
          var content = element('.doc-example-live [ng-view]').text();
          expect(content).toMatch(/controller\: ChapterCntl/);
          expect(content).toMatch(/Book Id\: Moby/);
          expect(content).toMatch(/Chapter Id\: 1/);

          element('a:contains("Scarlet")').click();
          content = element('.doc-example-live [ng-view]').text();
          expect(content).toMatch(/controller\: BookCntl/);
          expect(content).toMatch(/Book Id\: Scarlet/);
        });
      </file>
    </example>
 */


/**
 * @ngdoc event
 * @name ngRoute.directive:ngView#$viewContentLoaded
 * @eventOf ngRoute.directive:ngView
 * @eventType emit on the current ngView scope
 * @description
 * Emitted every time the ngView content is reloaded.
 */
ngViewFactory.$inject = ['$route', '$anchorScroll', '$compile', '$controller', '$animate'];
function ngViewFactory(   $route,   $anchorScroll,   $compile,   $controller,   $animate) {
  return {
    restrict: 'ECA',
    terminal: true,
    priority: 400,
    transclude: 'element',
    link: function(scope, $element, attr, ctrl, $transclude) {
        var currentScope,
            currentElement,
            autoScrollExp = attr.autoscroll,
            onloadExp = attr.onload || '';

        scope.$on('$routeChangeSuccess', update);
        update();

        function cleanupLastView() {
          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }
          if(currentElement) {
            $animate.leave(currentElement);
            currentElement = null;
          }
        }

        function update() {
          var locals = $route.current && $route.current.locals,
              template = locals && locals.$template;

          if (template) {
            var newScope = scope.$new();
            $transclude(newScope, function(clone) {
              clone.html(template);
              $animate.enter(clone, null, currentElement || $element, function onNgViewEnter () {
                if (angular.isDefined(autoScrollExp)
                  && (!autoScrollExp || scope.$eval(autoScrollExp))) {
                  $anchorScroll();
                }
              });

              cleanupLastView();

              var link = $compile(clone.contents()),
                  current = $route.current;

              currentScope = current.scope = newScope;
              currentElement = clone;

              if (current.controller) {
                locals.$scope = currentScope;
                var controller = $controller(current.controller, locals);
                if (current.controllerAs) {
                  currentScope[current.controllerAs] = controller;
                }
                clone.data('$ngControllerController', controller);
                clone.children().data('$ngControllerController', controller);
              }

              link(currentScope);
              currentScope.$emit('$viewContentLoaded');
              currentScope.$eval(onloadExp);
            });
          } else {
            cleanupLastView();
          }
        }
    }
  };
}


})(window, window.angular);

/**
 * State-based routing for AngularJS
 * @version v0.2.8
 * @link http://angular-ui.github.com/
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */

/* commonjs package manager support (eg componentjs) */
if (typeof module !== "undefined" && typeof exports !== "undefined" && module.exports === exports){
  module.exports = 'ui.router';
}

(function (window, angular, undefined) {
/*jshint globalstrict:true*/
/*global angular:false*/
'use strict';

var isDefined = angular.isDefined,
    isFunction = angular.isFunction,
    isString = angular.isString,
    isObject = angular.isObject,
    isArray = angular.isArray,
    forEach = angular.forEach,
    extend = angular.extend,
    copy = angular.copy;

function inherit(parent, extra) {
  return extend(new (extend(function() {}, { prototype: parent }))(), extra);
}

function merge(dst) {
  forEach(arguments, function(obj) {
    if (obj !== dst) {
      forEach(obj, function(value, key) {
        if (!dst.hasOwnProperty(key)) dst[key] = value;
      });
    }
  });
  return dst;
}

/**
 * Finds the common ancestor path between two states.
 *
 * @param {Object} first The first state.
 * @param {Object} second The second state.
 * @return {Array} Returns an array of state names in descending order, not including the root.
 */
function ancestors(first, second) {
  var path = [];

  for (var n in first.path) {
    if (first.path[n] !== second.path[n]) break;
    path.push(first.path[n]);
  }
  return path;
}

/**
 * IE8-safe wrapper for `Object.keys()`.
 *
 * @param {Object} object A JavaScript object.
 * @return {Array} Returns the keys of the object as an array.
 */
function keys(object) {
  if (Object.keys) {
    return Object.keys(object);
  }
  var result = [];

  angular.forEach(object, function(val, key) {
    result.push(key);
  });
  return result;
}

/**
 * IE8-safe wrapper for `Array.prototype.indexOf()`.
 *
 * @param {Array} array A JavaScript array.
 * @param {*} value A value to search the array for.
 * @return {Number} Returns the array index value of `value`, or `-1` if not present.
 */
function arraySearch(array, value) {
  if (Array.prototype.indexOf) {
    return array.indexOf(value, Number(arguments[2]) || 0);
  }
  var len = array.length >>> 0, from = Number(arguments[2]) || 0;
  from = (from < 0) ? Math.ceil(from) : Math.floor(from);

  if (from < 0) from += len;

  for (; from < len; from++) {
    if (from in array && array[from] === value) return from;
  }
  return -1;
}

/**
 * Merges a set of parameters with all parameters inherited between the common parents of the
 * current state and a given destination state.
 *
 * @param {Object} currentParams The value of the current state parameters ($stateParams).
 * @param {Object} newParams The set of parameters which will be composited with inherited params.
 * @param {Object} $current Internal definition of object representing the current state.
 * @param {Object} $to Internal definition of object representing state to transition to.
 */
function inheritParams(currentParams, newParams, $current, $to) {
  var parents = ancestors($current, $to), parentParams, inherited = {}, inheritList = [];

  for (var i in parents) {
    if (!parents[i].params || !parents[i].params.length) continue;
    parentParams = parents[i].params;

    for (var j in parentParams) {
      if (arraySearch(inheritList, parentParams[j]) >= 0) continue;
      inheritList.push(parentParams[j]);
      inherited[parentParams[j]] = currentParams[parentParams[j]];
    }
  }
  return extend({}, inherited, newParams);
}

/**
 * Normalizes a set of values to string or `null`, filtering them by a list of keys.
 *
 * @param {Array} keys The list of keys to normalize/return.
 * @param {Object} values An object hash of values to normalize.
 * @return {Object} Returns an object hash of normalized string values.
 */
function normalize(keys, values) {
  var normalized = {};

  forEach(keys, function (name) {
    var value = values[name];
    normalized[name] = (value != null) ? String(value) : null;
  });
  return normalized;
}

/**
 * Performs a non-strict comparison of the subset of two objects, defined by a list of keys.
 *
 * @param {Object} a The first object.
 * @param {Object} b The second object.
 * @param {Array} keys The list of keys within each object to compare. If the list is empty or not specified,
 *                     it defaults to the list of keys in `a`.
 * @return {Boolean} Returns `true` if the keys match, otherwise `false`.
 */
function equalForKeys(a, b, keys) {
  if (!keys) {
    keys = [];
    for (var n in a) keys.push(n); // Used instead of Object.keys() for IE8 compatibility
  }

  for (var i=0; i<keys.length; i++) {
    var k = keys[i];
    if (a[k] != b[k]) return false; // Not '===', values aren't necessarily normalized
  }
  return true;
}

/**
 * Returns the subset of an object, based on a list of keys.
 *
 * @param {Array} keys
 * @param {Object} values
 * @return {Boolean} Returns a subset of `values`.
 */
function filterByKeys(keys, values) {
  var filtered = {};

  forEach(keys, function (name) {
    filtered[name] = values[name];
  });
  return filtered;
}

/**
 * @ngdoc overview
 * @name ui.router.util
 *
 * @description
 *
 */
angular.module('ui.router.util', ['ng']);

/**
 * @ngdoc overview
 * @name ui.router.router
 * 
 * @requires ui.router.util
 *
 * @description
 *
 */
angular.module('ui.router.router', ['ui.router.util']);

/**
 * @ngdoc overview
 * @name ui.router.router
 * 
 * @requires ui.router.router
 * @requires ui.router.util
 *
 * @description
 *
 */
angular.module('ui.router.state', ['ui.router.router', 'ui.router.util']);

/**
 * @ngdoc overview
 * @name ui.router
 *
 * @requires ui.router.state
 *
 * @description
 *
 */
angular.module('ui.router', ['ui.router.state']);
/**
 * @ngdoc overview
 * @name ui.router.compat
 *
 * @requires ui.router
 *
 * @description
 *
 */
angular.module('ui.router.compat', ['ui.router']);

/**
 * @ngdoc object
 * @name ui.router.util.$resolve
 *
 * @requires $q
 * @requires $injector
 *
 * @description
 * Manages resolution of (acyclic) graphs of promises.
 */
$Resolve.$inject = ['$q', '$injector'];
function $Resolve(  $q,    $injector) {
  
  var VISIT_IN_PROGRESS = 1,
      VISIT_DONE = 2,
      NOTHING = {},
      NO_DEPENDENCIES = [],
      NO_LOCALS = NOTHING,
      NO_PARENT = extend($q.when(NOTHING), { $$promises: NOTHING, $$values: NOTHING });
  

  /**
   * @ngdoc function
   * @name ui.router.util.$resolve#study
   * @methodOf ui.router.util.$resolve
   *
   * @description
   * Studies a set of invocables that are likely to be used multiple times.
   * <pre>
   * $resolve.study(invocables)(locals, parent, self)
   * </pre>
   * is equivalent to
   * <pre>
   * $resolve.resolve(invocables, locals, parent, self)
   * </pre>
   * but the former is more efficient (in fact `resolve` just calls `study` 
   * internally).
   *
   * @param {object} invocables Invocable objects
   * @return {function} a function to pass in locals, parent and self
   */
  this.study = function (invocables) {
    if (!isObject(invocables)) throw new Error("'invocables' must be an object");
    
    // Perform a topological sort of invocables to build an ordered plan
    var plan = [], cycle = [], visited = {};
    function visit(value, key) {
      if (visited[key] === VISIT_DONE) return;
      
      cycle.push(key);
      if (visited[key] === VISIT_IN_PROGRESS) {
        cycle.splice(0, cycle.indexOf(key));
        throw new Error("Cyclic dependency: " + cycle.join(" -> "));
      }
      visited[key] = VISIT_IN_PROGRESS;
      
      if (isString(value)) {
        plan.push(key, [ function() { return $injector.get(value); }], NO_DEPENDENCIES);
      } else {
        var params = $injector.annotate(value);
        forEach(params, function (param) {
          if (param !== key && invocables.hasOwnProperty(param)) visit(invocables[param], param);
        });
        plan.push(key, value, params);
      }
      
      cycle.pop();
      visited[key] = VISIT_DONE;
    }
    forEach(invocables, visit);
    invocables = cycle = visited = null; // plan is all that's required
    
    function isResolve(value) {
      return isObject(value) && value.then && value.$$promises;
    }
    
    return function (locals, parent, self) {
      if (isResolve(locals) && self === undefined) {
        self = parent; parent = locals; locals = null;
      }
      if (!locals) locals = NO_LOCALS;
      else if (!isObject(locals)) {
        throw new Error("'locals' must be an object");
      }       
      if (!parent) parent = NO_PARENT;
      else if (!isResolve(parent)) {
        throw new Error("'parent' must be a promise returned by $resolve.resolve()");
      }
      
      // To complete the overall resolution, we have to wait for the parent
      // promise and for the promise for each invokable in our plan.
      var resolution = $q.defer(),
          result = resolution.promise,
          promises = result.$$promises = {},
          values = extend({}, locals),
          wait = 1 + plan.length/3,
          merged = false;
          
      function done() {
        // Merge parent values we haven't got yet and publish our own $$values
        if (!--wait) {
          if (!merged) merge(values, parent.$$values); 
          result.$$values = values;
          result.$$promises = true; // keep for isResolve()
          resolution.resolve(values);
        }
      }
      
      function fail(reason) {
        result.$$failure = reason;
        resolution.reject(reason);
      }
      
      // Short-circuit if parent has already failed
      if (isDefined(parent.$$failure)) {
        fail(parent.$$failure);
        return result;
      }
      
      // Merge parent values if the parent has already resolved, or merge
      // parent promises and wait if the parent resolve is still in progress.
      if (parent.$$values) {
        merged = merge(values, parent.$$values);
        done();
      } else {
        extend(promises, parent.$$promises);
        parent.then(done, fail);
      }
      
      // Process each invocable in the plan, but ignore any where a local of the same name exists.
      for (var i=0, ii=plan.length; i<ii; i+=3) {
        if (locals.hasOwnProperty(plan[i])) done();
        else invoke(plan[i], plan[i+1], plan[i+2]);
      }
      
      function invoke(key, invocable, params) {
        // Create a deferred for this invocation. Failures will propagate to the resolution as well.
        var invocation = $q.defer(), waitParams = 0;
        function onfailure(reason) {
          invocation.reject(reason);
          fail(reason);
        }
        // Wait for any parameter that we have a promise for (either from parent or from this
        // resolve; in that case study() will have made sure it's ordered before us in the plan).
        forEach(params, function (dep) {
          if (promises.hasOwnProperty(dep) && !locals.hasOwnProperty(dep)) {
            waitParams++;
            promises[dep].then(function (result) {
              values[dep] = result;
              if (!(--waitParams)) proceed();
            }, onfailure);
          }
        });
        if (!waitParams) proceed();
        function proceed() {
          if (isDefined(result.$$failure)) return;
          try {
            invocation.resolve($injector.invoke(invocable, self, values));
            invocation.promise.then(function (result) {
              values[key] = result;
              done();
            }, onfailure);
          } catch (e) {
            onfailure(e);
          }
        }
        // Publish promise synchronously; invocations further down in the plan may depend on it.
        promises[key] = invocation.promise;
      }
      
      return result;
    };
  };
  
  /**
   * @ngdoc function
   * @name ui.router.util.$resolve#resolve
   * @methodOf ui.router.util.$resolve
   *
   * @description
   * Resolves a set of invocables. An invocable is a function to be invoked via 
   * `$injector.invoke()`, and can have an arbitrary number of dependencies. 
   * An invocable can either return a value directly,
   * or a `$q` promise. If a promise is returned it will be resolved and the 
   * resulting value will be used instead. Dependencies of invocables are resolved 
   * (in this order of precedence)
   *
   * - from the specified `locals`
   * - from another invocable that is part of this `$resolve` call
   * - from an invocable that is inherited from a `parent` call to `$resolve` 
   *   (or recursively
   * - from any ancestor `$resolve` of that parent).
   *
   * The return value of `$resolve` is a promise for an object that contains 
   * (in this order of precedence)
   *
   * - any `locals` (if specified)
   * - the resolved return values of all injectables
   * - any values inherited from a `parent` call to `$resolve` (if specified)
   *
   * The promise will resolve after the `parent` promise (if any) and all promises 
   * returned by injectables have been resolved. If any invocable 
   * (or `$injector.invoke`) throws an exception, or if a promise returned by an 
   * invocable is rejected, the `$resolve` promise is immediately rejected with the 
   * same error. A rejection of a `parent` promise (if specified) will likewise be 
   * propagated immediately. Once the `$resolve` promise has been rejected, no 
   * further invocables will be called.
   * 
   * Cyclic dependencies between invocables are not permitted and will caues `$resolve`
   * to throw an error. As a special case, an injectable can depend on a parameter 
   * with the same name as the injectable, which will be fulfilled from the `parent` 
   * injectable of the same name. This allows inherited values to be decorated. 
   * Note that in this case any other injectable in the same `$resolve` with the same
   * dependency would see the decorated value, not the inherited value.
   *
   * Note that missing dependencies -- unlike cyclic dependencies -- will cause an 
   * (asynchronous) rejection of the `$resolve` promise rather than a (synchronous) 
   * exception.
   *
   * Invocables are invoked eagerly as soon as all dependencies are available. 
   * This is true even for dependencies inherited from a `parent` call to `$resolve`.
   *
   * As a special case, an invocable can be a string, in which case it is taken to 
   * be a service name to be passed to `$injector.get()`. This is supported primarily 
   * for backwards-compatibility with the `resolve` property of `$routeProvider` 
   * routes.
   *
   * @param {object} invocables functions to invoke or 
   * `$injector` services to fetch.
   * @param {object} locals  values to make available to the injectables
   * @param {object} parent  a promise returned by another call to `$resolve`.
   * @param {object} self  the `this` for the invoked methods
   * @return {object} Promise for an object that contains the resolved return value
   * of all invocables, as well as any inherited and local values.
   */
  this.resolve = function (invocables, locals, parent, self) {
    return this.study(invocables)(locals, parent, self);
  };
}

angular.module('ui.router.util').service('$resolve', $Resolve);


/**
 * @ngdoc object
 * @name ui.router.util.$templateFactory
 *
 * @requires $http
 * @requires $templateCache
 * @requires $injector
 *
 * @description
 * Service. Manages loading of templates.
 */
$TemplateFactory.$inject = ['$http', '$templateCache', '$injector'];
function $TemplateFactory(  $http,   $templateCache,   $injector) {

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromConfig
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template from a configuration object. 
   *
   * @param {object} config Configuration object for which to load a template. 
   * The following properties are search in the specified order, and the first one 
   * that is defined is used to create the template:
   *
   * @param {string|object} config.template html string template or function to 
   * load via {@link ui.router.util.$templateFactory#fromString fromString}.
   * @param {string|object} config.templateUrl url to load or a function returning 
   * the url to load via {@link ui.router.util.$templateFactory#fromUrl fromUrl}.
   * @param {Function} config.templateProvider function to invoke via 
   * {@link ui.router.util.$templateFactory#fromProvider fromProvider}.
   * @param {object} params  Parameters to pass to the template function.
   * @param {object} locals Locals to pass to `invoke` if the template is loaded 
   * via a `templateProvider`. Defaults to `{ params: params }`.
   *
   * @return {string|object}  The template html as a string, or a promise for 
   * that string,or `null` if no template is configured.
   */
  this.fromConfig = function (config, params, locals) {
    return (
      isDefined(config.template) ? this.fromString(config.template, params) :
      isDefined(config.templateUrl) ? this.fromUrl(config.templateUrl, params) :
      isDefined(config.templateProvider) ? this.fromProvider(config.templateProvider, params, locals) :
      null
    );
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromString
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template from a string or a function returning a string.
   *
   * @param {string|object} template html template as a string or function that 
   * returns an html template as a string.
   * @param {object} params Parameters to pass to the template function.
   *
   * @return {string|object} The template html as a string, or a promise for that 
   * string.
   */
  this.fromString = function (template, params) {
    return isFunction(template) ? template(params) : template;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromUrl
   * @methodOf ui.router.util.$templateFactory
   * 
   * @description
   * Loads a template from the a URL via `$http` and `$templateCache`.
   *
   * @param {string|Function} url url of the template to load, or a function 
   * that returns a url.
   * @param {Object} params Parameters to pass to the url function.
   * @return {string|Promise.<string>} The template html as a string, or a promise 
   * for that string.
   */
  this.fromUrl = function (url, params) {
    if (isFunction(url)) url = url(params);
    if (url == null) return null;
    else return $http
        .get(url, { cache: $templateCache })
        .then(function(response) { return response.data; });
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromUrl
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template by invoking an injectable provider function.
   *
   * @param {Function} provider Function to invoke via `$injector.invoke`
   * @param {Object} params Parameters for the template.
   * @param {Object} locals Locals to pass to `invoke`. Defaults to 
   * `{ params: params }`.
   * @return {string|Promise.<string>} The template html as a string, or a promise 
   * for that string.
   */
  this.fromProvider = function (provider, params, locals) {
    return $injector.invoke(provider, null, locals || { params: params });
  };
}

angular.module('ui.router.util').service('$templateFactory', $TemplateFactory);

/**
 * Matches URLs against patterns and extracts named parameters from the path or the search
 * part of the URL. A URL pattern consists of a path pattern, optionally followed by '?' and a list
 * of search parameters. Multiple search parameter names are separated by '&'. Search parameters
 * do not influence whether or not a URL is matched, but their values are passed through into
 * the matched parameters returned by {@link UrlMatcher#exec exec}.
 * 
 * Path parameter placeholders can be specified using simple colon/catch-all syntax or curly brace
 * syntax, which optionally allows a regular expression for the parameter to be specified:
 *
 * * ':' name - colon placeholder
 * * '*' name - catch-all placeholder
 * * '{' name '}' - curly placeholder
 * * '{' name ':' regexp '}' - curly placeholder with regexp. Should the regexp itself contain
 *   curly braces, they must be in matched pairs or escaped with a backslash.
 *
 * Parameter names may contain only word characters (latin letters, digits, and underscore) and
 * must be unique within the pattern (across both path and search parameters). For colon 
 * placeholders or curly placeholders without an explicit regexp, a path parameter matches any
 * number of characters other than '/'. For catch-all placeholders the path parameter matches
 * any number of characters.
 * 
 * ### Examples
 * 
 * * '/hello/' - Matches only if the path is exactly '/hello/'. There is no special treatment for
 *   trailing slashes, and patterns have to match the entire path, not just a prefix.
 * * '/user/:id' - Matches '/user/bob' or '/user/1234!!!' or even '/user/' but not '/user' or
 *   '/user/bob/details'. The second path segment will be captured as the parameter 'id'.
 * * '/user/{id}' - Same as the previous example, but using curly brace syntax.
 * * '/user/{id:[^/]*}' - Same as the previous example.
 * * '/user/{id:[0-9a-fA-F]{1,8}}' - Similar to the previous example, but only matches if the id
 *   parameter consists of 1 to 8 hex digits.
 * * '/files/{path:.*}' - Matches any URL starting with '/files/' and captures the rest of the
 *   path into the parameter 'path'.
 * * '/files/*path' - ditto.
 *
 * @constructor
 * @param {string} pattern  the pattern to compile into a matcher.
 *
 * @property {string} prefix  A static prefix of this pattern. The matcher guarantees that any
 *   URL matching this matcher (i.e. any string for which {@link UrlMatcher#exec exec()} returns
 *   non-null) will start with this prefix.
 */
function UrlMatcher(pattern) {

  // Find all placeholders and create a compiled pattern, using either classic or curly syntax:
  //   '*' name
  //   ':' name
  //   '{' name '}'
  //   '{' name ':' regexp '}'
  // The regular expression is somewhat complicated due to the need to allow curly braces
  // inside the regular expression. The placeholder regexp breaks down as follows:
  //    ([:*])(\w+)               classic placeholder ($1 / $2)
  //    \{(\w+)(?:\:( ... ))?\}   curly brace placeholder ($3) with optional regexp ... ($4)
  //    (?: ... | ... | ... )+    the regexp consists of any number of atoms, an atom being either
  //    [^{}\\]+                  - anything other than curly braces or backslash
  //    \\.                       - a backslash escape
  //    \{(?:[^{}\\]+|\\.)*\}     - a matched set of curly braces containing other atoms
  var placeholder = /([:*])(\w+)|\{(\w+)(?:\:((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g,
      names = {}, compiled = '^', last = 0, m,
      segments = this.segments = [],
      params = this.params = [];

  function addParameter(id) {
    if (!/^\w+(-+\w+)*$/.test(id)) throw new Error("Invalid parameter name '" + id + "' in pattern '" + pattern + "'");
    if (names[id]) throw new Error("Duplicate parameter name '" + id + "' in pattern '" + pattern + "'");
    names[id] = true;
    params.push(id);
  }

  function quoteRegExp(string) {
    return string.replace(/[\\\[\]\^$*+?.()|{}]/g, "\\$&");
  }

  this.source = pattern;

  // Split into static segments separated by path parameter placeholders.
  // The number of segments is always 1 more than the number of parameters.
  var id, regexp, segment;
  while ((m = placeholder.exec(pattern))) {
    id = m[2] || m[3]; // IE[78] returns '' for unmatched groups instead of null
    regexp = m[4] || (m[1] == '*' ? '.*' : '[^/]*');
    segment = pattern.substring(last, m.index);
    if (segment.indexOf('?') >= 0) break; // we're into the search part
    compiled += quoteRegExp(segment) + '(' + regexp + ')';
    addParameter(id);
    segments.push(segment);
    last = placeholder.lastIndex;
  }
  segment = pattern.substring(last);

  // Find any search parameter names and remove them from the last segment
  var i = segment.indexOf('?');
  if (i >= 0) {
    var search = this.sourceSearch = segment.substring(i);
    segment = segment.substring(0, i);
    this.sourcePath = pattern.substring(0, last+i);

    // Allow parameters to be separated by '?' as well as '&' to make concat() easier
    forEach(search.substring(1).split(/[&?]/), addParameter);
  } else {
    this.sourcePath = pattern;
    this.sourceSearch = '';
  }

  compiled += quoteRegExp(segment) + '$';
  segments.push(segment);
  this.regexp = new RegExp(compiled);
  this.prefix = segments[0];
}

/**
 * Returns a new matcher for a pattern constructed by appending the path part and adding the
 * search parameters of the specified pattern to this pattern. The current pattern is not
 * modified. This can be understood as creating a pattern for URLs that are relative to (or
 * suffixes of) the current pattern.
 *
 * ### Example
 * The following two matchers are equivalent:
 * ```
 * new UrlMatcher('/user/{id}?q').concat('/details?date');
 * new UrlMatcher('/user/{id}/details?q&date');
 * ```
 *
 * @param {string} pattern  The pattern to append.
 * @return {UrlMatcher}  A matcher for the concatenated pattern.
 */
UrlMatcher.prototype.concat = function (pattern) {
  // Because order of search parameters is irrelevant, we can add our own search
  // parameters to the end of the new pattern. Parse the new pattern by itself
  // and then join the bits together, but it's much easier to do this on a string level.
  return new UrlMatcher(this.sourcePath + pattern + this.sourceSearch);
};

UrlMatcher.prototype.toString = function () {
  return this.source;
};

/**
 * Tests the specified path against this matcher, and returns an object containing the captured
 * parameter values, or null if the path does not match. The returned object contains the values
 * of any search parameters that are mentioned in the pattern, but their value may be null if
 * they are not present in `searchParams`. This means that search parameters are always treated
 * as optional.
 *
 * ### Example
 * ```
 * new UrlMatcher('/user/{id}?q&r').exec('/user/bob', { x:'1', q:'hello' });
 * // returns { id:'bob', q:'hello', r:null }
 * ```
 *
 * @param {string} path  The URL path to match, e.g. `$location.path()`.
 * @param {Object} searchParams  URL search parameters, e.g. `$location.search()`.
 * @return {Object}  The captured parameter values.
 */
UrlMatcher.prototype.exec = function (path, searchParams) {
  var m = this.regexp.exec(path);
  if (!m) return null;

  var params = this.params, nTotal = params.length,
    nPath = this.segments.length-1,
    values = {}, i;

  if (nPath !== m.length - 1) throw new Error("Unbalanced capture group in route '" + this.source + "'");

  for (i=0; i<nPath; i++) values[params[i]] = m[i+1];
  for (/**/; i<nTotal; i++) values[params[i]] = searchParams[params[i]];

  return values;
};

/**
 * Returns the names of all path and search parameters of this pattern in an unspecified order.
 * @return {Array.<string>}  An array of parameter names. Must be treated as read-only. If the
 *    pattern has no parameters, an empty array is returned.
 */
UrlMatcher.prototype.parameters = function () {
  return this.params;
};

/**
 * Creates a URL that matches this pattern by substituting the specified values
 * for the path and search parameters. Null values for path parameters are
 * treated as empty strings.
 *
 * ### Example
 * ```
 * new UrlMatcher('/user/{id}?q').format({ id:'bob', q:'yes' });
 * // returns '/user/bob?q=yes'
 * ```
 *
 * @param {Object} values  the values to substitute for the parameters in this pattern.
 * @return {string}  the formatted URL (path and optionally search part).
 */
UrlMatcher.prototype.format = function (values) {
  var segments = this.segments, params = this.params;
  if (!values) return segments.join('');

  var nPath = segments.length-1, nTotal = params.length,
    result = segments[0], i, search, value;

  for (i=0; i<nPath; i++) {
    value = values[params[i]];
    // TODO: Maybe we should throw on null here? It's not really good style to use '' and null interchangeabley
    if (value != null) result += encodeURIComponent(value);
    result += segments[i+1];
  }
  for (/**/; i<nTotal; i++) {
    value = values[params[i]];
    if (value != null) {
      result += (search ? '&' : '?') + params[i] + '=' + encodeURIComponent(value);
      search = true;
    }
  }

  return result;
};

/**
 * Service. Factory for {@link UrlMatcher} instances. The factory is also available to providers
 * under the name `$urlMatcherFactoryProvider`.
 * @constructor
 * @name $urlMatcherFactory
 */
function $UrlMatcherFactory() {
  /**
   * Creates a {@link UrlMatcher} for the specified pattern.
   * @function
   * @name $urlMatcherFactory#compile
   * @methodOf $urlMatcherFactory
   * @param {string} pattern  The URL pattern.
   * @return {UrlMatcher}  The UrlMatcher.
   */
  this.compile = function (pattern) {
    return new UrlMatcher(pattern);
  };

  /**
   * Returns true if the specified object is a UrlMatcher, or false otherwise.
   * @function
   * @name $urlMatcherFactory#isMatcher
   * @methodOf $urlMatcherFactory
   * @param {Object} o
   * @return {boolean}
   */
  this.isMatcher = function (o) {
    return isObject(o) && isFunction(o.exec) && isFunction(o.format) && isFunction(o.concat);
  };

  this.$get = function () {
    return this;
  };
}

// Register as a provider so it's available to other providers
angular.module('ui.router.util').provider('$urlMatcherFactory', $UrlMatcherFactory);

/**
 * @ngdoc object
 * @name ui.router.router.$urlRouterProvider
 *
 * @requires ui.router.util.$urlMatcherFactoryProvider
 *
 * @description
 * `$urlRouterProvider` has the responsibility of watching `$location`. 
 * When `$location` changes it runs through a list of rules one by one until a 
 * match is found. `$urlRouterProvider` is used behind the scenes anytime you specify 
 * a url in a state configuration. All urls are compiled into a UrlMatcher object.
 *
 * There are several methods on `$urlRouterProvider` that make it useful to use directly
 * in your module config.
 */
$UrlRouterProvider.$inject = ['$urlMatcherFactoryProvider'];
function $UrlRouterProvider(  $urlMatcherFactory) {
  var rules = [], 
      otherwise = null;

  // Returns a string that is a prefix of all strings matching the RegExp
  function regExpPrefix(re) {
    var prefix = /^\^((?:\\[^a-zA-Z0-9]|[^\\\[\]\^$*+?.()|{}]+)*)/.exec(re.source);
    return (prefix != null) ? prefix[1].replace(/\\(.)/g, "$1") : '';
  }

  // Interpolates matched values into a String.replace()-style pattern
  function interpolate(pattern, match) {
    return pattern.replace(/\$(\$|\d{1,2})/, function (m, what) {
      return match[what === '$' ? 0 : Number(what)];
    });
  }

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#rule
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Defines rules that are used by `$urlRouterProvider to find matches for
   * specific URLs.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   // Here's an example of how you might allow case insensitive urls
   *   $urlRouterProvider.rule(function ($injector, $location) {
   *     var path = $location.path(),
   *         normalized = path.toLowerCase();
   *
   *     if (path !== normalized) {
   *       return normalized;
   *     }
   *   });
   * });
   * </pre>
   *
   * @param {object} rule Handler function that takes `$injector` and `$location`
   * services as arguments. You can use them to return a valid path as a string.
   *
   * @return {object} $urlRouterProvider - $urlRouterProvider instance
   */
  this.rule =
    function (rule) {
      if (!isFunction(rule)) throw new Error("'rule' must be a function");
      rules.push(rule);
      return this;
    };

  /**
   * @ngdoc object
   * @name ui.router.router.$urlRouterProvider#otherwise
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Defines a path that is used when an invalied route is requested.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   // if the path doesn't match any of the urls you configured
   *   // otherwise will take care of routing the user to the
   *   // specified url
   *   $urlRouterProvider.otherwise('/index');
   *
   *   // Example of using function rule as param
   *   $urlRouterProvider.otherwise(function ($injector, $location) {
   *     ...
   *   });
   * });
   * </pre>
   *
   * @param {string|object} rule The url path you want to redirect to or a function 
   * rule that returns the url path. The function version is passed two params: 
   * `$injector` and `$location` services.
   *
   * @return {object} $urlRouterProvider - $urlRouterProvider instance
   */
  this.otherwise =
    function (rule) {
      if (isString(rule)) {
        var redirect = rule;
        rule = function () { return redirect; };
      }
      else if (!isFunction(rule)) throw new Error("'rule' must be a function");
      otherwise = rule;
      return this;
    };


  function handleIfMatch($injector, handler, match) {
    if (!match) return false;
    var result = $injector.invoke(handler, handler, { $match: match });
    return isDefined(result) ? result : true;
  }

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#when
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Registers a handler for a given url matching. if handle is a string, it is
   * treated as a redirect, and is interpolated according to the syyntax of match
   * (i.e. like String.replace() for RegExp, or like a UrlMatcher pattern otherwise).
   *
   * If the handler is a function, it is injectable. It gets invoked if `$location`
   * matches. You have the option of inject the match object as `$match`.
   *
   * The handler can return
   *
   * - **falsy** to indicate that the rule didn't match after all, then `$urlRouter`
   *   will continue trying to find another one that matches.
   * - **string** which is treated as a redirect and passed to `$location.url()`
   * - **void** or any **truthy** value tells `$urlRouter` that the url was handled.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   $urlRouterProvider.when($state.url, function ($match, $stateParams) {
   *     if ($state.$current.navigable !== state ||
   *         !equalForKeys($match, $stateParams) {
   *      $state.transitionTo(state, $match, false);
   *     }
   *   });
   * });
   * </pre>
   *
   * @param {string|object} what The incoming path that you want to redirect.
   * @param {string|object} handler The path you want to redirect your user to.
   */
  this.when =
    function (what, handler) {
      var redirect, handlerIsString = isString(handler);
      if (isString(what)) what = $urlMatcherFactory.compile(what);

      if (!handlerIsString && !isFunction(handler) && !isArray(handler))
        throw new Error("invalid 'handler' in when()");

      var strategies = {
        matcher: function (what, handler) {
          if (handlerIsString) {
            redirect = $urlMatcherFactory.compile(handler);
            handler = ['$match', function ($match) { return redirect.format($match); }];
          }
          return extend(function ($injector, $location) {
            return handleIfMatch($injector, handler, what.exec($location.path(), $location.search()));
          }, {
            prefix: isString(what.prefix) ? what.prefix : ''
          });
        },
        regex: function (what, handler) {
          if (what.global || what.sticky) throw new Error("when() RegExp must not be global or sticky");

          if (handlerIsString) {
            redirect = handler;
            handler = ['$match', function ($match) { return interpolate(redirect, $match); }];
          }
          return extend(function ($injector, $location) {
            return handleIfMatch($injector, handler, what.exec($location.path()));
          }, {
            prefix: regExpPrefix(what)
          });
        }
      };

      var check = { matcher: $urlMatcherFactory.isMatcher(what), regex: what instanceof RegExp };

      for (var n in check) {
        if (check[n]) {
          return this.rule(strategies[n](what, handler));
        }
      }

      throw new Error("invalid 'what' in when()");
    };

  /**
   * @ngdoc object
   * @name ui.router.router.$urlRouter
   *
   * @requires $location
   * @requires $rootScope
   * @requires $injector
   *
   * @description
   *
   */
  this.$get =
    [        '$location', '$rootScope', '$injector',
    function ($location,   $rootScope,   $injector) {
      // TODO: Optimize groups of rules with non-empty prefix into some sort of decision tree
      function update(evt) {
        if (evt && evt.defaultPrevented) return;
        function check(rule) {
          var handled = rule($injector, $location);
          if (handled) {
            if (isString(handled)) $location.replace().url(handled);
            return true;
          }
          return false;
        }
        var n=rules.length, i;
        for (i=0; i<n; i++) {
          if (check(rules[i])) return;
        }
        // always check otherwise last to allow dynamic updates to the set of rules
        if (otherwise) check(otherwise);
      }

      $rootScope.$on('$locationChangeSuccess', update);

      return {
        /**
         * @ngdoc function
         * @name ui.router.router.$urlRouter#sync
         * @methodOf ui.router.router.$urlRouter
         *
         * @description
         * Triggers an update; the same update that happens when the address bar url changes, aka `$locationChangeSuccess`.
         * This method is useful when you need to use `preventDefault()` on the `$locationChangeSuccess` event, 
         * perform some custom logic (route protection, auth, config, redirection, etc) and then finally proceed 
         * with the transition by calling `$urlRouter.sync()`.
         *
         * @example
         * <pre>
         * angular.module('app', ['ui.router']);
         *   .run(function($rootScope, $urlRouter) {
         *     $rootScope.$on('$locationChangeSuccess', function(evt) {
         *       // Halt state change from even starting
         *       evt.preventDefault();
         *       // Perform custom logic
         *       var meetsRequirement = ...
         *       // Continue with the update and state transition if logic allows
         *       if (meetsRequirement) $urlRouter.sync();
         *     });
         * });
         * </pre>
         */
        sync: function () {
          update();
        }
      };
    }];
}

angular.module('ui.router.router').provider('$urlRouter', $UrlRouterProvider);

/**
 * @ngdoc object
 * @name ui.router.state.$stateProvider
 *
 * @requires ui.router.router.$urlRouterProvider
 * @requires ui.router.util.$urlMatcherFactoryProvider
 * @requires $locationProvider
 *
 * @description
 * The new `$stateProvider` works similar to Angular's v1 router, but it focuses purely
 * on state.
 *
 * A state corresponds to a "place" in the application in terms of the overall UI and
 * navigation. A state describes (via the controller / template / view properties) what
 * the UI looks like and does at that place.
 *
 * States often have things in common, and the primary way of factoring out these
 * commonalities in this model is via the state hierarchy, i.e. parent/child states aka
 * nested states.
 *
 * The `$stateProvider` provides interfaces to declare these states for your app.
 */
$StateProvider.$inject = ['$urlRouterProvider', '$urlMatcherFactoryProvider', '$locationProvider'];
function $StateProvider(   $urlRouterProvider,   $urlMatcherFactory,           $locationProvider) {

  var root, states = {}, $state, queue = {}, abstractKey = 'abstract';

  // Builds state properties from definition passed to registerState()
  var stateBuilder = {

    // Derive parent state from a hierarchical name only if 'parent' is not explicitly defined.
    // state.children = [];
    // if (parent) parent.children.push(state);
    parent: function(state) {
      if (isDefined(state.parent) && state.parent) return findState(state.parent);
      // regex matches any valid composite state name
      // would match "contact.list" but not "contacts"
      var compositeName = /^(.+)\.[^.]+$/.exec(state.name);
      return compositeName ? findState(compositeName[1]) : root;
    },

    // inherit 'data' from parent and override by own values (if any)
    data: function(state) {
      if (state.parent && state.parent.data) {
        state.data = state.self.data = extend({}, state.parent.data, state.data);
      }
      return state.data;
    },

    // Build a URLMatcher if necessary, either via a relative or absolute URL
    url: function(state) {
      var url = state.url;

      if (isString(url)) {
        if (url.charAt(0) == '^') {
          return $urlMatcherFactory.compile(url.substring(1));
        }
        return (state.parent.navigable || root).url.concat(url);
      }

      if ($urlMatcherFactory.isMatcher(url) || url == null) {
        return url;
      }
      throw new Error("Invalid url '" + url + "' in state '" + state + "'");
    },

    // Keep track of the closest ancestor state that has a URL (i.e. is navigable)
    navigable: function(state) {
      return state.url ? state : (state.parent ? state.parent.navigable : null);
    },

    // Derive parameters for this state and ensure they're a super-set of parent's parameters
    params: function(state) {
      if (!state.params) {
        return state.url ? state.url.parameters() : state.parent.params;
      }
      if (!isArray(state.params)) throw new Error("Invalid params in state '" + state + "'");
      if (state.url) throw new Error("Both params and url specicified in state '" + state + "'");
      return state.params;
    },

    // If there is no explicit multi-view configuration, make one up so we don't have
    // to handle both cases in the view directive later. Note that having an explicit
    // 'views' property will mean the default unnamed view properties are ignored. This
    // is also a good time to resolve view names to absolute names, so everything is a
    // straight lookup at link time.
    views: function(state) {
      var views = {};

      forEach(isDefined(state.views) ? state.views : { '': state }, function (view, name) {
        if (name.indexOf('@') < 0) name += '@' + state.parent.name;
        views[name] = view;
      });
      return views;
    },

    ownParams: function(state) {
      if (!state.parent) {
        return state.params;
      }
      var paramNames = {}; forEach(state.params, function (p) { paramNames[p] = true; });

      forEach(state.parent.params, function (p) {
        if (!paramNames[p]) {
          throw new Error("Missing required parameter '" + p + "' in state '" + state.name + "'");
        }
        paramNames[p] = false;
      });
      var ownParams = [];

      forEach(paramNames, function (own, p) {
        if (own) ownParams.push(p);
      });
      return ownParams;
    },

    // Keep a full path from the root down to this state as this is needed for state activation.
    path: function(state) {
      return state.parent ? state.parent.path.concat(state) : []; // exclude root from path
    },

    // Speed up $state.contains() as it's used a lot
    includes: function(state) {
      var includes = state.parent ? extend({}, state.parent.includes) : {};
      includes[state.name] = true;
      return includes;
    },

    $delegates: {}
  };

  function isRelative(stateName) {
    return stateName.indexOf(".") === 0 || stateName.indexOf("^") === 0;
  }

  function findState(stateOrName, base) {
    var isStr = isString(stateOrName),
        name  = isStr ? stateOrName : stateOrName.name,
        path  = isRelative(name);

    if (path) {
      if (!base) throw new Error("No reference point given for path '"  + name + "'");
      var rel = name.split("."), i = 0, pathLength = rel.length, current = base;

      for (; i < pathLength; i++) {
        if (rel[i] === "" && i === 0) {
          current = base;
          continue;
        }
        if (rel[i] === "^") {
          if (!current.parent) throw new Error("Path '" + name + "' not valid for state '" + base.name + "'");
          current = current.parent;
          continue;
        }
        break;
      }
      rel = rel.slice(i).join(".");
      name = current.name + (current.name && rel ? "." : "") + rel;
    }
    var state = states[name];

    if (state && (isStr || (!isStr && (state === stateOrName || state.self === stateOrName)))) {
      return state;
    }
    return undefined;
  }

  function queueState(parentName, state) {
    if (!queue[parentName]) {
      queue[parentName] = [];
    }
    queue[parentName].push(state);
  }

  function registerState(state) {
    // Wrap a new object around the state so we can store our private details easily.
    state = inherit(state, {
      self: state,
      resolve: state.resolve || {},
      toString: function() { return this.name; }
    });

    var name = state.name;
    if (!isString(name) || name.indexOf('@') >= 0) throw new Error("State must have a valid name");
    if (states.hasOwnProperty(name)) throw new Error("State '" + name + "'' is already defined");

    // Get parent name
    var parentName = (name.indexOf('.') !== -1) ? name.substring(0, name.lastIndexOf('.'))
        : (isString(state.parent)) ? state.parent
        : '';

    // If parent is not registered yet, add state to queue and register later
    if (parentName && !states[parentName]) {
      return queueState(parentName, state.self);
    }

    for (var key in stateBuilder) {
      if (isFunction(stateBuilder[key])) state[key] = stateBuilder[key](state, stateBuilder.$delegates[key]);
    }
    states[name] = state;

    // Register the state in the global state list and with $urlRouter if necessary.
    if (!state[abstractKey] && state.url) {
      $urlRouterProvider.when(state.url, ['$match', '$stateParams', function ($match, $stateParams) {
        if ($state.$current.navigable != state || !equalForKeys($match, $stateParams)) {
          $state.transitionTo(state, $match, { location: false });
        }
      }]);
    }

    // Register any queued children
    if (queue[name]) {
      for (var i = 0; i < queue[name].length; i++) {
        registerState(queue[name][i]);
      }
    }

    return state;
  }


  // Implicit root state that is always active
  root = registerState({
    name: '',
    url: '^',
    views: null,
    'abstract': true
  });
  root.navigable = null;


  /**
   * @ngdoc function
   * @name ui.router.state.$stateProvider#decorator
   * @methodOf ui.router.state.$stateProvider
   *
   * @description
   * Allows you to extend (carefully) or override (at your own peril) the 
   * `stateBuilder` object used internally by `$stateProvider`. This can be used 
   * to add custom functionality to ui-router, for example inferring templateUrl 
   * based on the state name.
   *
   * When passing only a name, it returns the current (original or decorated) builder
   * function that matches `name`.
   *
   * The builder functions that can be decorated are listed below. Though not all
   * necessarily have a good use case for decoration, that is up to you to decide.
   *
   * In addition, users can attach custom decorators, which will generate new 
   * properties within the state's internal definition. There is currently no clear 
   * use-case for this beyond accessing internal states (i.e. $state.$current), 
   * however, expect this to become increasingly relevant as we introduce additional 
   * meta-programming features.
   *
   * **Warning**: Decorators should not be interdependent because the order of 
   * execution of the builder functions in nondeterministic. Builder functions 
   * should only be dependent on the state definition object and super function.
   *
   *
   * Existing builder functions and current return values:
   *
   * - parent - `{object}` - returns the parent state object.
   * - data - `{object}` - returns state data, including any inherited data that is not
   *   overridden by own values (if any).
   * - url - `{object}` - returns a UrlMatcher or null.
   * - navigable - returns closest ancestor state that has a URL (aka is 
   *   navigable).
   * - params - `{object}` - returns an array of state params that are ensured to 
   *   be a super-set of parent's params.
   * - views - `{object}` - returns a views object where each key is an absolute view 
   *   name (i.e. "viewName@stateName") and each value is the config object 
   *   (template, controller) for the view. Even when you don't use the views object 
   *   explicitly on a state config, one is still created for you internally.
   *   So by decorating this builder function you have access to decorating template 
   *   and controller properties.
   * - ownParams - `{object}` - returns an array of params that belong to the state, 
   *   not including any params defined by ancestor states.
   * - path - `{string}` - returns the full path from the root down to this state. 
   *   Needed for state activation.
   * - includes - `{object}` - returns an object that includes every state that 
   *   would pass a '$state.includes()' test.
   *
   * @example
   * <pre>
   * // Override the internal 'views' builder with a function that takes the state
   * // definition, and a reference to the internal function being overridden:
   * $stateProvider.decorator('views', function ($state, parent) {
   *   var result = {},
   *       views = parent(state);
   *
   *   angular.forEach(view, function (config, name) {
   *     var autoName = (state.name + '.' + name).replace('.', '/');
   *     config.templateUrl = config.templateUrl || '/partials/' + autoName + '.html';
   *     result[name] = config;
   *   });
   *   return result;
   * });
   *
   * $stateProvider.state('home', {
   *   views: {
   *     'contact.list': { controller: 'ListController' },
   *     'contact.item': { controller: 'ItemController' }
   *   }
   * });
   *
   * // ...
   *
   * $state.go('home');
   * // Auto-populates list and item views with /partials/home/contact/list.html,
   * // and /partials/home/contact/item.html, respectively.
   * </pre>
   *
   * @param {string} name The name of the builder function to decorate. 
   * @param {object} func A function that is responsible for decorating the original 
   * builder function. The function receives two parameters:
   *
   *   - `{object}` - state - The state config object.
   *   - `{object}` - super - The original builder function.
   *
   * @return {object} $stateProvider - $stateProvider instance
   */
  this.decorator = decorator;
  function decorator(name, func) {
    /*jshint validthis: true */
    if (isString(name) && !isDefined(func)) {
      return stateBuilder[name];
    }
    if (!isFunction(func) || !isString(name)) {
      return this;
    }
    if (stateBuilder[name] && !stateBuilder.$delegates[name]) {
      stateBuilder.$delegates[name] = stateBuilder[name];
    }
    stateBuilder[name] = func;
    return this;
  }

  /**
   * @ngdoc function
   * @name ui.router.state.$stateProvider#state
   * @methodOf ui.router.state.$stateProvider
   *
   * @description
   * Registers a state configuration under a given state name. The stateConfig object
   * has the following acceptable properties.
   * 
   * - [`template`, `templateUrl`, `templateProvider`] - There are three ways to setup
   *   your templates.
   *
   *   - `{string|object}` - template - String HTML content, or function that returns an HTML
   *   string.
   *   - `{string}` - templateUrl - String URL path to template file OR function,
   *   that returns URL path string.
   *   - `{object}` - templateProvider - Provider function that returns HTML content
   *   string.
   *
   * - [`controller`, `controllerProvider`] - A controller paired to the state. You can
   *   either use a controller, or a controller provider.
   *
   *   - `{string|object}` - controller - Controller function or controller name.
   *   - `{object}` - controllerProvider - Injectable provider function that returns
   *   the actual controller or string.
   *
   * - `{object}` - resolve - A map of dependencies which should be injected into the
   *   controller.
   *
   * - `{string}` - url - A url with optional parameters. When a state is navigated or
   *   transitioned to, the `$stateParams` service will be populated with any 
   *   parameters that were passed.
   *
   * - `{object}` - params - An array of parameter names or regular expressions. Only 
   *   use this within a state if you are not using url. Otherwise you can specify your
   *   parameters within the url. When a state is navigated or transitioned to, the 
   *   $stateParams service will be populated with any parameters that were passed.
   *
   * - `{object}` - views - Use the views property to set up multiple views. 
   *   If you don't need multiple views within a single state this property is not 
   *   needed. Tip: remember that often nested views are more useful and powerful 
   *   than multiple sibling views.
   *
   * - `{boolean}` - abstract - An abstract state will never be directly activated, 
   *   but can provide inherited properties to its common children states.
   *
   * - `{object}` - onEnter - Callback function for when a state is entered. Good way
   *   to trigger an action or dispatch an event, such as opening a dialog.
   *
   * - `{object}` - onExit - Callback function for when a state is exited. Good way to
   *   trigger an action or dispatch an event, such as opening a dialog.
   *
   * - `{object}` - data - Arbitrary data object, useful for custom configuration.
   *
   * @example
   * <pre>
   * // The state() method takes a unique stateName (String) and a stateConfig (Object)
   * $stateProvider.state(stateName, stateConfig);
   *
   * // stateName can be a single top-level name (must be unique).
   * $stateProvider.state("home", {});
   *
   * // Or it can be a nested state name. This state is a child of the above "home" state.
   * $stateProvider.state("home.newest", {});
   *
   * // Nest states as deeply as needed.
   * $stateProvider.state("home.newest.abc.xyz.inception", {});
   *
   * // state() returns $stateProvider, so you can chain state declarations.
   * $stateProvider
   *   .state("home", {})
   *   .state("about", {})
   *   .state("contacts", {});
   * </pre>
   *
   * @param {string} name A unique state name, e.g. "home", "about", "contacts". 
   * To create a parent/child state use a dot, e.g. "about.sales", "home.newest".
   * @param {object} definition State configuratino object.
   */
  this.state = state;
  function state(name, definition) {
    /*jshint validthis: true */
    if (isObject(name)) definition = name;
    else definition.name = name;
    registerState(definition);
    return this;
  }

  /**
   * @ngdoc object
   * @name ui.router.state.$state
   *
   * @requires $rootScope
   * @requires $q
   * @requires ui.router.state.$view
   * @requires $injector
   * @requires ui.router.util.$resolve
   * @requires ui.router.state.$stateParams
   *
   * @property {object} params A param object, e.g. {sectionId: section.id)}, that 
   * you'd like to test against the current active state.
   * @property {object} current A reference to the state's config object. However 
   * you passed it in. Useful for accessing custom data.
   * @property {object} transition Currently pending transition. A promise that'll 
   * resolve or reject.
   *
   * @description
   * `$state` service is responsible for representing states as well as transitioning
   * between them. It also provides interfaces to ask for current state or even states
   * you're coming from.
   */
  // $urlRouter is injected just to ensure it gets instantiated
  this.$get = $get;
  $get.$inject = ['$rootScope', '$q', '$view', '$injector', '$resolve', '$stateParams', '$location', '$urlRouter'];
  function $get(   $rootScope,   $q,   $view,   $injector,   $resolve,   $stateParams,   $location,   $urlRouter) {

    var TransitionSuperseded = $q.reject(new Error('transition superseded'));
    var TransitionPrevented = $q.reject(new Error('transition prevented'));
    var TransitionAborted = $q.reject(new Error('transition aborted'));
    var TransitionFailed = $q.reject(new Error('transition failed'));
    var currentLocation = $location.url();

    function syncUrl() {
      if ($location.url() !== currentLocation) {
        $location.url(currentLocation);
        $location.replace();
      }
    }

    root.locals = { resolve: null, globals: { $stateParams: {} } };
    $state = {
      params: {},
      current: root.self,
      $current: root,
      transition: null
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#reload
     * @methodOf ui.router.state.$state
     *
     * @description
     * Reloads the current state by re-transitioning to it.
     *
     * @example
     * <pre>
     * var app angular.module('app', ['ui.router.state']);
     *
     * app.controller('ctrl', function ($state) {
     *   $state.reload();
     * });
     * </pre>
     */
    $state.reload = function reload() {
      $state.transitionTo($state.current, $stateParams, { reload: true, inherit: false, notify: false });
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#go
     * @methodOf ui.router.state.$state
     *
     * @description
     * Convenience method for transitioning to a new state. `$state.go` calls 
     * `$state.transitionTo` internally but automatically sets options to 
     * `{ location: true, inherit: true, relative: $state.$current, notify: true }`. 
     * This allows you to easily use an absolute or relative to path and specify 
     * only the parameters you'd like to update (while letting unspecified parameters 
     * inherit from the current state.
     *
     * Some examples:
     *
     * - `$state.go('contact.detail')` - will go to the `contact.detail` state
     * - `$state.go('^')` - will go to a parent state
     * - `$state.go('^.sibling')` - will go to a sibling state
     * - `$state.go('.child.grandchild')` - will go to grandchild state
     *
     * @example
     * <pre>
     * var app = angular.module('app', ['ui.router.state']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.changeState = function () {
     *     $state.go('contact.detail');
     *   };
     * });
     * </pre>
     *
     * @param {string} to Absolute State Name or Relative State Path.
     * @param {object} params A map of the parameters that will be sent to the state, 
     * will populate $stateParams.
     * @param {object} options If Object is passed, object is an options hash.
     */
    $state.go = function go(to, params, options) {
      return this.transitionTo(to, params, extend({ inherit: true, relative: $state.$current }, options));
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#transitionTo
     * @methodOf ui.router.state.$state
     *
     * @description
     * Low-level method for transitioning to a new state. {@link ui.router.state.$state#methods_go $state.go}
     * uses `transitionTo` internally. `$state.go` is recommended in most situations.
     *
     * @example
     * <pre>
     * var app = angular.module('app', ['ui.router.state']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.changeState = function () {
     *     $state.transitionTo('contact.detail');
     *   };
     * });
     * </pre>
     *
     * @param {string} to Absolute State Name or Relative State Path.
     * @param {object} params A map of the parameters that will be sent to the state, 
     * will populate $stateParams.
     * @param {object} options If Object is passed, object is an options hash.
     */
    $state.transitionTo = function transitionTo(to, toParams, options) {
      toParams = toParams || {};
      options = extend({
        location: true, inherit: false, relative: null, notify: true, reload: false, $retry: false
      }, options || {});

      var from = $state.$current, fromParams = $state.params, fromPath = from.path;
      var evt, toState = findState(to, options.relative);

      if (!isDefined(toState)) {
        // Broadcast not found event and abort the transition if prevented
        var redirect = { to: to, toParams: toParams, options: options };
        evt = $rootScope.$broadcast('$stateNotFound', redirect, from.self, fromParams);
        if (evt.defaultPrevented) {
          syncUrl();
          return TransitionAborted;
        }

        // Allow the handler to return a promise to defer state lookup retry
        if (evt.retry) {
          if (options.$retry) {
            syncUrl();
            return TransitionFailed;
          }
          var retryTransition = $state.transition = $q.when(evt.retry);
          retryTransition.then(function() {
            if (retryTransition !== $state.transition) return TransitionSuperseded;
            redirect.options.$retry = true;
            return $state.transitionTo(redirect.to, redirect.toParams, redirect.options);
          }, function() {
            return TransitionAborted;
          });
          syncUrl();
          return retryTransition;
        }

        // Always retry once if the $stateNotFound was not prevented
        // (handles either redirect changed or state lazy-definition)
        to = redirect.to;
        toParams = redirect.toParams;
        options = redirect.options;
        toState = findState(to, options.relative);
        if (!isDefined(toState)) {
          if (options.relative) throw new Error("Could not resolve '" + to + "' from state '" + options.relative + "'");
          throw new Error("No such state '" + to + "'");
        }
      }
      if (toState[abstractKey]) throw new Error("Cannot transition to abstract state '" + to + "'");
      if (options.inherit) toParams = inheritParams($stateParams, toParams || {}, $state.$current, toState);
      to = toState;

      var toPath = to.path;

      // Starting from the root of the path, keep all levels that haven't changed
      var keep, state, locals = root.locals, toLocals = [];
      for (keep = 0, state = toPath[keep];
           state && state === fromPath[keep] && equalForKeys(toParams, fromParams, state.ownParams) && !options.reload;
           keep++, state = toPath[keep]) {
        locals = toLocals[keep] = state.locals;
      }

      // If we're going to the same state and all locals are kept, we've got nothing to do.
      // But clear 'transition', as we still want to cancel any other pending transitions.
      // TODO: We may not want to bump 'transition' if we're called from a location change that we've initiated ourselves,
      // because we might accidentally abort a legitimate transition initiated from code?
      if (shouldTriggerReload(to, from, locals, options) ) {
        if ( to.self.reloadOnSearch !== false )
          syncUrl();
        $state.transition = null;
        return $q.when($state.current);
      }

      // Normalize/filter parameters before we pass them to event handlers etc.
      toParams = normalize(to.params, toParams || {});

      // Broadcast start event and cancel the transition if requested
      if (options.notify) {
        evt = $rootScope.$broadcast('$stateChangeStart', to.self, toParams, from.self, fromParams);
        if (evt.defaultPrevented) {
          syncUrl();
          return TransitionPrevented;
        }
      }

      // Resolve locals for the remaining states, but don't update any global state just
      // yet -- if anything fails to resolve the current state needs to remain untouched.
      // We also set up an inheritance chain for the locals here. This allows the view directive
      // to quickly look up the correct definition for each view in the current state. Even
      // though we create the locals object itself outside resolveState(), it is initially
      // empty and gets filled asynchronously. We need to keep track of the promise for the
      // (fully resolved) current locals, and pass this down the chain.
      var resolved = $q.when(locals);
      for (var l=keep; l<toPath.length; l++, state=toPath[l]) {
        locals = toLocals[l] = inherit(locals);
        resolved = resolveState(state, toParams, state===to, resolved, locals);
      }

      // Once everything is resolved, we are ready to perform the actual transition
      // and return a promise for the new state. We also keep track of what the
      // current promise is, so that we can detect overlapping transitions and
      // keep only the outcome of the last transition.
      var transition = $state.transition = resolved.then(function () {
        var l, entering, exiting;

        if ($state.transition !== transition) return TransitionSuperseded;

        // Exit 'from' states not kept
        for (l=fromPath.length-1; l>=keep; l--) {
          exiting = fromPath[l];
          if (exiting.self.onExit) {
            $injector.invoke(exiting.self.onExit, exiting.self, exiting.locals.globals);
          }
          exiting.locals = null;
        }

        // Enter 'to' states not kept
        for (l=keep; l<toPath.length; l++) {
          entering = toPath[l];
          entering.locals = toLocals[l];
          if (entering.self.onEnter) {
            $injector.invoke(entering.self.onEnter, entering.self, entering.locals.globals);
          }
        }

        // Run it again, to catch any transitions in callbacks
        if ($state.transition !== transition) return TransitionSuperseded;

        // Update globals in $state
        $state.$current = to;
        $state.current = to.self;
        $state.params = toParams;
        copy($state.params, $stateParams);
        $state.transition = null;

        // Update $location
        var toNav = to.navigable;
        if (options.location && toNav) {
          $location.url(toNav.url.format(toNav.locals.globals.$stateParams));

          if (options.location === 'replace') {
            $location.replace();
          }
        }

        if (options.notify) {
          $rootScope.$broadcast('$stateChangeSuccess', to.self, toParams, from.self, fromParams);
        }
        currentLocation = $location.url();

        return $state.current;
      }, function (error) {
        if ($state.transition !== transition) return TransitionSuperseded;

        $state.transition = null;
        $rootScope.$broadcast('$stateChangeError', to.self, toParams, from.self, fromParams, error);
        syncUrl();

        return $q.reject(error);
      });

      return transition;
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#is
     * @methodOf ui.router.state.$state
     *
     * @description
     * Similar to {@link ui.router.state.$state#methods_includes $state.includes},
     * but only checks for the full state name. If params is supplied then it will be 
     * tested for strict equality against the current active params object, so all params 
     * must match with none missing and no extras.
     *
     * @example
     * <pre>
     * $state.is('contact.details.item'); // returns true
     * $state.is(contactDetailItemStateObject); // returns true
     *
     * // everything else would return false
     * </pre>
     *
     * @param {string|object} stateName The state name or state object you'd like to check.
     * @param {object} params A param object, e.g. `{sectionId: section.id}`, that you'd like 
     * to test against the current active state.
     * @returns {boolean} Returns true or false whether its the state or not.
     */
    $state.is = function is(stateOrName, params) {
      var state = findState(stateOrName);

      if (!isDefined(state)) {
        return undefined;
      }

      if ($state.$current !== state) {
        return false;
      }

      return isDefined(params) && params !== null ? angular.equals($stateParams, params) : true;
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#includes
     * @methodOf ui.router.state.$state
     *
     * @description
     * A method to determine if the current active state is equal to or is the child of the 
     * state stateName. If any params are passed then they will be tested for a match as well.
     * Not all the parameters need to be passed, just the ones you'd like to test for equality.
     *
     * @example
     * <pre>
     * $state.includes("contacts"); // returns true
     * $state.includes("contacts.details"); // returns true
     * $state.includes("contacts.details.item"); // returns true
     * $state.includes("contacts.list"); // returns false
     * $state.includes("about"); // returns false
     * </pre>
     *
     * @param {string} stateOrName A partial name to be searched for within the current state name.
     * @param {object} params A param object, e.g. `{sectionId: section.id}`, 
     * that you'd like to test against the current active state.
     * @returns {boolean} True or false
     */
    $state.includes = function includes(stateOrName, params) {
      var state = findState(stateOrName);
      if (!isDefined(state)) {
        return undefined;
      }

      if (!isDefined($state.$current.includes[state.name])) {
        return false;
      }

      var validParams = true;
      angular.forEach(params, function(value, key) {
        if (!isDefined($stateParams[key]) || $stateParams[key] !== value) {
          validParams = false;
        }
      });
      return validParams;
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#href
     * @methodOf ui.router.state.$state
     *
     * @description
     * A url generation method that returns the compiled url for the given state populated with the given params.
     *
     * @example
     * <pre>
     * expect($state.href("about.person", { person: "bob" })).toEqual("/about/bob");
     * </pre>
     *
     * @param {string|object} stateOrName The state name or state object you'd like to generate a url from.
     * @param {object} params An object of parameter values to fill the state's required parameters.
     * @returns {string} url
     */
    $state.href = function href(stateOrName, params, options) {
      options = extend({ lossy: true, inherit: false, absolute: false, relative: $state.$current }, options || {});
      var state = findState(stateOrName, options.relative);
      if (!isDefined(state)) return null;

      params = inheritParams($stateParams, params || {}, $state.$current, state);
      var nav = (state && options.lossy) ? state.navigable : state;
      var url = (nav && nav.url) ? nav.url.format(normalize(state.params, params || {})) : null;
      if (!$locationProvider.html5Mode() && url) {
        url = "#" + $locationProvider.hashPrefix() + url;
      }
      if (options.absolute && url) {
        url = $location.protocol() + '://' + 
              $location.host() + 
              ($location.port() == 80 || $location.port() == 443 ? '' : ':' + $location.port()) + 
              (!$locationProvider.html5Mode() && url ? '/' : '') + 
              url;
      }
      return url;
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#get
     * @methodOf ui.router.state.$state
     *
     * @description
     * Returns the state configuration object for any state by passing the name
     * as a string. Without any arguments it'll return a array of all configured
     * state objects.
     *
     * @param {string|object} stateOrName The name of the state for which you'd like 
     * to get the original state configuration object for.
     * @returns {object} State configuration object or array of all objects.
     */
    $state.get = function (stateOrName, context) {
      if (!isDefined(stateOrName)) {
        var list = [];
        forEach(states, function(state) { list.push(state.self); });
        return list;
      }
      var state = findState(stateOrName, context);
      return (state && state.self) ? state.self : null;
    };

    function resolveState(state, params, paramsAreFiltered, inherited, dst) {
      // Make a restricted $stateParams with only the parameters that apply to this state if
      // necessary. In addition to being available to the controller and onEnter/onExit callbacks,
      // we also need $stateParams to be available for any $injector calls we make during the
      // dependency resolution process.
      var $stateParams = (paramsAreFiltered) ? params : filterByKeys(state.params, params);
      var locals = { $stateParams: $stateParams };

      // Resolve 'global' dependencies for the state, i.e. those not specific to a view.
      // We're also including $stateParams in this; that way the parameters are restricted
      // to the set that should be visible to the state, and are independent of when we update
      // the global $state and $stateParams values.
      dst.resolve = $resolve.resolve(state.resolve, locals, dst.resolve, state);
      var promises = [ dst.resolve.then(function (globals) {
        dst.globals = globals;
      }) ];
      if (inherited) promises.push(inherited);

      // Resolve template and dependencies for all views.
      forEach(state.views, function (view, name) {
        var injectables = (view.resolve && view.resolve !== state.resolve ? view.resolve : {});
        injectables.$template = [ function () {
          return $view.load(name, { view: view, locals: locals, params: $stateParams, notify: false }) || '';
        }];

        promises.push($resolve.resolve(injectables, locals, dst.resolve, state).then(function (result) {
          // References to the controller (only instantiated at link time)
          if (isFunction(view.controllerProvider) || isArray(view.controllerProvider)) {
            var injectLocals = angular.extend({}, injectables, locals);
            result.$$controller = $injector.invoke(view.controllerProvider, null, injectLocals);
          } else {
            result.$$controller = view.controller;
          }
          // Provide access to the state itself for internal use
          result.$$state = state;
          dst[name] = result;
        }));
      });

      // Wait for all the promises and then return the activation object
      return $q.all(promises).then(function (values) {
        return dst;
      });
    }

    return $state;
  }

  function shouldTriggerReload(to, from, locals, options) {
    if ( to === from && ((locals === from.locals && !options.reload) || (to.self.reloadOnSearch === false)) ) {
      return true;
    }
  }
}

angular.module('ui.router.state')
  .value('$stateParams', {})
  .provider('$state', $StateProvider);


$ViewProvider.$inject = [];
function $ViewProvider() {

  this.$get = $get;
  /**
   * @ngdoc object
   * @name ui.router.state.$view
   *
   * @requires ui.router.util.$templateFactory
   * @requires $rootScope
   *
   * @description
   *
   */
  $get.$inject = ['$rootScope', '$templateFactory'];
  function $get(   $rootScope,   $templateFactory) {
    return {
      // $view.load('full.viewName', { template: ..., controller: ..., resolve: ..., async: false, params: ... })
      /**
       * @ngdoc function
       * @name ui.router.state.$view#load
       * @methodOf ui.router.state.$view
       *
       * @description
       *
       * @param {string} name name
       * @param {object} options option object.
       */
      load: function load(name, options) {
        var result, defaults = {
          template: null, controller: null, view: null, locals: null, notify: true, async: true, params: {}
        };
        options = extend(defaults, options);

        if (options.view) {
          result = $templateFactory.fromConfig(options.view, options.params, options.locals);
        }
        if (result && options.notify) {
          $rootScope.$broadcast('$viewContentLoading', options);
        }
        return result;
      }
    };
  }
}

angular.module('ui.router.state').provider('$view', $ViewProvider);

/**
 * @ngdoc object
 * @name ui.router.state.$uiViewScroll
 *
 * @requires $anchorScroll
 * @requires $timeout
 *
 * @description
 * When called with a jqLite element, it scrolls the element into view (after a
 * `$timeout` so the DOM has time to refresh).
 *
 * If you prefer to rely on `$anchorScroll` to scroll the view to the anchor,
 * this can be enabled by calling `$uiViewScrollProvider.useAnchorScroll()`.
 */
function $ViewScrollProvider() {

  var useAnchorScroll = false;

  this.useAnchorScroll = function () {
    useAnchorScroll = true;
  };

  this.$get = ['$anchorScroll', '$timeout', function ($anchorScroll, $timeout) {
    if (useAnchorScroll) {
      return $anchorScroll;
    }

    return function ($element) {
      $timeout(function () {
        $element[0].scrollIntoView();
      }, 0, false);
    };
  }];
}

angular.module('ui.router.state').provider('$uiViewScroll', $ViewScrollProvider);

/**
 * @ngdoc directive
 * @name ui.router.state.diretive.ui-view
 *
 * @requires ui.router.state.$state
 * @requires $compile
 * @requires $controller
 * @requires $injector
 *
 * @restrict ECA
 *
 * @description
 * The ui-view directive tells $state where to place your templates.
 * A view can be unnamed or named.
 *
 * @param {string} ui-view A view name.
 */
$ViewDirective.$inject = ['$state', '$compile', '$controller', '$injector', '$uiViewScroll', '$document'];
function $ViewDirective(   $state,   $compile,   $controller,   $injector,   $uiViewScroll,   $document) {

  function getService() {
    return ($injector.has) ? function(service) {
      return $injector.has(service) ? $injector.get(service) : null;
    } : function(service) {
      try {
        return $injector.get(service);
      } catch (e) {
        return null;
      }
    };
  }

  var viewIsUpdating = false,
      service = getService(),
      $animator = service('$animator'),
      $animate = service('$animate');

  // Returns a set of DOM manipulation functions based on whether animation
  // should be performed
  function getRenderer(element, attrs, scope) {
    var statics = function() {
      return {
        leave: function (element) { element.remove(); },
        enter: function (element, parent, anchor) { anchor.after(element); }
      };
    };

    if ($animate) {
      return function(shouldAnimate) {
        return !shouldAnimate ? statics() : {
          enter: function(element, parent, anchor) { $animate.enter(element, null, anchor); },
          leave: function(element) { $animate.leave(element, function() { element.remove(); }); }
        };
      };
    }

    if ($animator) {
      var animate = $animator && $animator(scope, attrs);

      return function(shouldAnimate) {
        return !shouldAnimate ? statics() : {
          enter: function(element, parent, anchor) { animate.enter(element, parent); },
          leave: function(element) { animate.leave(element.contents(), element); }
        };
      };
    }

    return statics;
  }

  var directive = {
    restrict: 'ECA',
    compile: function (element, attrs) {
      var initial   = element.html(),
          isDefault = true,
          anchor    = angular.element($document[0].createComment(' ui-view-anchor ')),
          parentEl  = element.parent();

      element.prepend(anchor);

      return function ($scope) {
        var inherited = parentEl.inheritedData('$uiView');

        var currentScope, currentEl, viewLocals,
            name      = attrs[directive.name] || attrs.name || '',
            onloadExp = attrs.onload || '',
            autoscrollExp = attrs.autoscroll,
            renderer  = getRenderer(element, attrs, $scope);

        if (name.indexOf('@') < 0) name = name + '@' + (inherited ? inherited.state.name : '');
        var view = { name: name, state: null };

        var eventHook = function () {
          if (viewIsUpdating) return;
          viewIsUpdating = true;

          try { updateView(true); } catch (e) {
            viewIsUpdating = false;
            throw e;
          }
          viewIsUpdating = false;
        };

        $scope.$on('$stateChangeSuccess', eventHook);
        $scope.$on('$viewContentLoading', eventHook);

        updateView(false);

        function cleanupLastView() {
          if (currentEl) {
            renderer(true).leave(currentEl);
            currentEl = null;
          }

          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }
        }

        function updateView(shouldAnimate) {
          var locals = $state.$current && $state.$current.locals[name];

          if (isDefault) {
            isDefault = false;
            element.replaceWith(anchor);
          }

          if (!locals) {
            cleanupLastView();
            currentEl = element.clone();
            currentEl.html(initial);
            renderer(shouldAnimate).enter(currentEl, parentEl, anchor);

            currentScope = $scope.$new();
            $compile(currentEl.contents())(currentScope);
            return;
          }

          if (locals === viewLocals) return; // nothing to do

          cleanupLastView();

          currentEl = element.clone();
          currentEl.html(locals.$template ? locals.$template : initial);
          renderer(true).enter(currentEl, parentEl, anchor);

          currentEl.data('$uiView', view);

          viewLocals = locals;
          view.state = locals.$$state;

          var link = $compile(currentEl.contents());

          currentScope = $scope.$new();

          if (locals.$$controller) {
            locals.$scope = currentScope;
            var controller = $controller(locals.$$controller, locals);
            currentEl.children().data('$ngControllerController', controller);
          }

          link(currentScope);

          currentScope.$emit('$viewContentLoaded');
          if (onloadExp) currentScope.$eval(onloadExp);

          if (!angular.isDefined(autoscrollExp) || !autoscrollExp || $scope.$eval(autoscrollExp)) {
            $uiViewScroll(currentEl);
          }
        }
      };
    }
  };

  return directive;
}

angular.module('ui.router.state').directive('uiView', $ViewDirective);

function parseStateRef(ref) {
  var parsed = ref.replace(/\n/g, " ").match(/^([^(]+?)\s*(\((.*)\))?$/);
  if (!parsed || parsed.length !== 4) throw new Error("Invalid state ref '" + ref + "'");
  return { state: parsed[1], paramExpr: parsed[3] || null };
}

function stateContext(el) {
  var stateData = el.parent().inheritedData('$uiView');

  if (stateData && stateData.state && stateData.state.name) {
    return stateData.state;
  }
}

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref
 *
 * @requires ui.router.state.$state
 * @requires $timeout
 *
 * @restrict A
 *
 * @description
 * A directive that binds a link (`<a>` tag) to a state. If the state has an associated 
 * URL, the directive will automatically generate & update the `href` attribute via 
 * the {@link ui.router.state.$state#methods_href $state.href()} method. Clicking 
 * the link will trigger a state transition with optional parameters. 
 *
 * Also middle-clicking, right-clicking, and ctrl-clicking on the link will be 
 * handled natively by the browser.
 *
 * You can also use relative state paths within ui-sref, just like the relative 
 * paths passed to `$state.go()`. You just need to be aware that the path is relative
 * to the state that the link lives in, in other words the state that loaded the 
 * template containing the link.
 *
 * @example
 * <pre>
 * <a ui-sref="home">Home</a> | <a ui-sref="about">About</a>
 *
 * <ul>
 *   <li ng-repeat="contact in contacts">
 *     <a ui-sref="contacts.detail({ id: contact.id })">{{ contact.name }}</a>
 *   </li>
 * </ul>
 * </pre>
 *
 * @param {string} ui-sref 'stateName' can be any valid absolute or relative state
 */
$StateRefDirective.$inject = ['$state', '$timeout'];
function $StateRefDirective($state, $timeout) {
  return {
    restrict: 'A',
    require: '?^uiSrefActive',
    link: function(scope, element, attrs, uiSrefActive) {
      var ref = parseStateRef(attrs.uiSref);
      var params = null, url = null, base = stateContext(element) || $state.$current;
      var isForm = element[0].nodeName === "FORM";
      var attr = isForm ? "action" : "href", nav = true;

      var update = function(newVal) {
        if (newVal) params = newVal;
        if (!nav) return;

        var newHref = $state.href(ref.state, params, { relative: base });

        if (uiSrefActive) {
          uiSrefActive.$$setStateInfo(ref.state, params);
        }
        if (!newHref) {
          nav = false;
          return false;
        }
        element[0][attr] = newHref;
      };

      if (ref.paramExpr) {
        scope.$watch(ref.paramExpr, function(newVal, oldVal) {
          if (newVal !== params) update(newVal);
        }, true);
        params = scope.$eval(ref.paramExpr);
      }
      update();

      if (isForm) return;

      element.bind("click", function(e) {
        var button = e.which || e.button;
        if ((button === 0 || button == 1) && !e.ctrlKey && !e.metaKey && !e.shiftKey && !element.attr('target')) {
          // HACK: This is to allow ng-clicks to be processed before the transition is initiated:
          $timeout(function() {
            $state.go(ref.state, params, { relative: base });
          });
          e.preventDefault();
        }
      });
    }
  };
}

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref-active
 *
 * @requires ui.router.state.$state
 * @requires ui.router.state.$stateParams
 * @requires $interpolate
 *
 * @restrict A
 *
 * @description
 * A directive working alongside ui-sref to add classes to an element when the 
 * related ui-sref directive's state is active, and removing them when it is inactive.
 * The primary use-case is to simplify the special appearance of navigation menus 
 * relying on `ui-sref`, by having the "active" state's menu button appear different,
 * distinguishing it from the inactive menu items.
 *
 * @example
 * <pre>
 * <ul>
 *   <li ui-sref-active="active" class="item active">
 *     <a ui-sref="app.user({user: 'bilbobaggins'})" href="/users/bilbobaggins">@bilbobaggins</a>
 *   </li>
 *   <!-- ... -->
 * </ul>
 * </pre>
 */
$StateActiveDirective.$inject = ['$state', '$stateParams', '$interpolate'];
function $StateActiveDirective($state, $stateParams, $interpolate) {
  return {
    restrict: "A",
    controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
      var state, params, activeClass;

      // There probably isn't much point in $observing this
      activeClass = $interpolate($attrs.uiSrefActive || '', false)($scope);

      // Allow uiSref to communicate with uiSrefActive
      this.$$setStateInfo = function(newState, newParams) {
        state = $state.get(newState, stateContext($element));
        params = newParams;
        update();
      };

      $scope.$on('$stateChangeSuccess', update);

      // Update route state
      function update() {
        if ($state.$current.self === state && matchesParams()) {
          $element.addClass(activeClass);
        } else {
          $element.removeClass(activeClass);
        }
      }

      function matchesParams() {
        return !params || equalForKeys(params, $stateParams);
      }
    }]
  };
}

angular.module('ui.router.state')
  .directive('uiSref', $StateRefDirective)
  .directive('uiSrefActive', $StateActiveDirective);

/**
 * @ngdoc filter
 * @name ui.router.state.filter:isState
 *
 * @requires ui.router.state.$state
 *
 * @description
 * Translates to {@link ui.router.state.$state#is $state.is("stateName")}.
 */
$IsStateFilter.$inject = ['$state'];
function $IsStateFilter($state) {
  return function(state) {
    return $state.is(state);
  };
}

/**
 * @ngdoc filter
 * @name ui.router.state.filter:includeByState
 *
 * @requires ui.router.state.$state
 *
 * @description
 * Translates to {@link ui.router.state.$state#includes $state.includes()}.
 */
$IncludedByStateFilter.$inject = ['$state'];
function $IncludedByStateFilter($state) {
  return function(state) {
    return $state.includes(state);
  };
}

angular.module('ui.router.state')
  .filter('isState', $IsStateFilter)
  .filter('includedByState', $IncludedByStateFilter);

/**
 * @ngdoc object
 * @name ui.router.compat.$routeProvider
 *
 * @requires ui.router.state.$stateProvider
 * @requires ui.router.router.$urlRouterProvider
 *
 * @description
 * `$routeProvider` of the `ui.router.compat` module overwrites the existing
 * `routeProvider` from the core. This is done to provide compatibility between
 * the UI Router and the core router.
 *
 * It also provides a `when()` method to register routes that map to certain urls.
 * Behind the scenes it actually delegates either to 
 * {@link ui.router.router.$urlRouterProvider $urlRouterProvider} or to the 
 * {@link ui.router.state.$stateProvider $stateProvider} to postprocess the given 
 * router definition object.
 */
$RouteProvider.$inject = ['$stateProvider', '$urlRouterProvider'];
function $RouteProvider(  $stateProvider,    $urlRouterProvider) {

  var routes = [];

  onEnterRoute.$inject = ['$$state'];
  function onEnterRoute(   $$state) {
    /*jshint validthis: true */
    this.locals = $$state.locals.globals;
    this.params = this.locals.$stateParams;
  }

  function onExitRoute() {
    /*jshint validthis: true */
    this.locals = null;
    this.params = null;
  }

  this.when = when;
  /**
   * @ngdoc function
   * @name ui.router.compat.$routeProvider#when
   * @methodOf ui.router.compat.$routeProvider
   *
   * @description
   * Registers a route with a given route definition object. The route definition
   * object has the same interface the angular core route definition object has.
   * 
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.compat']);
   *
   * app.config(function ($routeProvider) {
   *   $routeProvider.when('home', {
   *     controller: function () { ... },
   *     templateUrl: 'path/to/template'
   *   });
   * });
   * </pre>
   *
   * @param {string} url URL as string
   * @param {object} route Route definition object
   *
   * @return {object} $routeProvider - $routeProvider instance
   */
  function when(url, route) {
    /*jshint validthis: true */
    if (route.redirectTo != null) {
      // Redirect, configure directly on $urlRouterProvider
      var redirect = route.redirectTo, handler;
      if (isString(redirect)) {
        handler = redirect; // leave $urlRouterProvider to handle
      } else if (isFunction(redirect)) {
        // Adapt to $urlRouterProvider API
        handler = function (params, $location) {
          return redirect(params, $location.path(), $location.search());
        };
      } else {
        throw new Error("Invalid 'redirectTo' in when()");
      }
      $urlRouterProvider.when(url, handler);
    } else {
      // Regular route, configure as state
      $stateProvider.state(inherit(route, {
        parent: null,
        name: 'route:' + encodeURIComponent(url),
        url: url,
        onEnter: onEnterRoute,
        onExit: onExitRoute
      }));
    }
    routes.push(route);
    return this;
  }

  /**
   * @ngdoc object
   * @name ui.router.compat.$route
   *
   * @requires ui.router.state.$state
   * @requires $rootScope
   * @requires $routeParams
   *
   * @property {object} routes - Array of registered routes.
   * @property {object} params - Current route params as object.
   * @property {string} current - Name of the current route.
   *
   * @description
   * The `$route` service provides interfaces to access defined routes. It also let's
   * you access route params through `$routeParams` service, so you have fully
   * control over all the stuff you would actually get from angular's core `$route`
   * service.
   */
  this.$get = $get;
  $get.$inject = ['$state', '$rootScope', '$routeParams'];
  function $get(   $state,   $rootScope,   $routeParams) {

    var $route = {
      routes: routes,
      params: $routeParams,
      current: undefined
    };

    function stateAsRoute(state) {
      return (state.name !== '') ? state : undefined;
    }

    $rootScope.$on('$stateChangeStart', function (ev, to, toParams, from, fromParams) {
      $rootScope.$broadcast('$routeChangeStart', stateAsRoute(to), stateAsRoute(from));
    });

    $rootScope.$on('$stateChangeSuccess', function (ev, to, toParams, from, fromParams) {
      $route.current = stateAsRoute(to);
      $rootScope.$broadcast('$routeChangeSuccess', stateAsRoute(to), stateAsRoute(from));
      copy(toParams, $route.params);
    });

    $rootScope.$on('$stateChangeError', function (ev, to, toParams, from, fromParams, error) {
      $rootScope.$broadcast('$routeChangeError', stateAsRoute(to), stateAsRoute(from), error);
    });

    return $route;
  }
}

angular.module('ui.router.compat')
  .provider('$route', $RouteProvider)
  .directive('ngView', $ViewDirective);
})(window, window.angular);
/*
 * angular-ui-bootstrap
 * http://angular-ui.github.io/bootstrap/

 * Version: 0.10.0 - 2014-01-13
 * License: MIT
 */
angular.module("ui.bootstrap", ["ui.bootstrap.tpls", "ui.bootstrap.transition","ui.bootstrap.collapse","ui.bootstrap.accordion","ui.bootstrap.alert","ui.bootstrap.bindHtml","ui.bootstrap.buttons","ui.bootstrap.carousel","ui.bootstrap.position","ui.bootstrap.datepicker","ui.bootstrap.dropdownToggle","ui.bootstrap.modal","ui.bootstrap.pagination","ui.bootstrap.tooltip","ui.bootstrap.popover","ui.bootstrap.progressbar","ui.bootstrap.rating","ui.bootstrap.tabs","ui.bootstrap.timepicker","ui.bootstrap.typeahead"]);
angular.module("ui.bootstrap.tpls", ["template/accordion/accordion-group.html","template/accordion/accordion.html","template/alert/alert.html","template/carousel/carousel.html","template/carousel/slide.html","template/datepicker/datepicker.html","template/datepicker/popup.html","template/modal/backdrop.html","template/modal/window.html","template/pagination/pager.html","template/pagination/pagination.html","template/tooltip/tooltip-html-unsafe-popup.html","template/tooltip/tooltip-popup.html","template/popover/popover.html","template/progressbar/bar.html","template/progressbar/progress.html","template/progressbar/progressbar.html","template/rating/rating.html","template/tabs/tab.html","template/tabs/tabset.html","template/timepicker/timepicker.html","template/typeahead/typeahead-match.html","template/typeahead/typeahead-popup.html"]);
angular.module('ui.bootstrap.transition', [])

/**
 * $transition service provides a consistent interface to trigger CSS 3 transitions and to be informed when they complete.
 * @param  {DOMElement} element  The DOMElement that will be animated.
 * @param  {string|object|function} trigger  The thing that will cause the transition to start:
 *   - As a string, it represents the css class to be added to the element.
 *   - As an object, it represents a hash of style attributes to be applied to the element.
 *   - As a function, it represents a function to be called that will cause the transition to occur.
 * @return {Promise}  A promise that is resolved when the transition finishes.
 */
.factory('$transition', ['$q', '$timeout', '$rootScope', function($q, $timeout, $rootScope) {

  var $transition = function(element, trigger, options) {
    options = options || {};
    var deferred = $q.defer();
    var endEventName = $transition[options.animation ? "animationEndEventName" : "transitionEndEventName"];

    var transitionEndHandler = function(event) {
      $rootScope.$apply(function() {
        element.unbind(endEventName, transitionEndHandler);
        deferred.resolve(element);
      });
    };

    if (endEventName) {
      element.bind(endEventName, transitionEndHandler);
    }

    // Wrap in a timeout to allow the browser time to update the DOM before the transition is to occur
    $timeout(function() {
      if ( angular.isString(trigger) ) {
        element.addClass(trigger);
      } else if ( angular.isFunction(trigger) ) {
        trigger(element);
      } else if ( angular.isObject(trigger) ) {
        element.css(trigger);
      }
      //If browser does not support transitions, instantly resolve
      if ( !endEventName ) {
        deferred.resolve(element);
      }
    });

    // Add our custom cancel function to the promise that is returned
    // We can call this if we are about to run a new transition, which we know will prevent this transition from ending,
    // i.e. it will therefore never raise a transitionEnd event for that transition
    deferred.promise.cancel = function() {
      if ( endEventName ) {
        element.unbind(endEventName, transitionEndHandler);
      }
      deferred.reject('Transition cancelled');
    };

    return deferred.promise;
  };

  // Work out the name of the transitionEnd event
  var transElement = document.createElement('trans');
  var transitionEndEventNames = {
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'transitionend',
    'OTransition': 'oTransitionEnd',
    'transition': 'transitionend'
  };
  var animationEndEventNames = {
    'WebkitTransition': 'webkitAnimationEnd',
    'MozTransition': 'animationend',
    'OTransition': 'oAnimationEnd',
    'transition': 'animationend'
  };
  function findEndEventName(endEventNames) {
    for (var name in endEventNames){
      if (transElement.style[name] !== undefined) {
        return endEventNames[name];
      }
    }
  }
  $transition.transitionEndEventName = findEndEventName(transitionEndEventNames);
  $transition.animationEndEventName = findEndEventName(animationEndEventNames);
  return $transition;
}]);

angular.module('ui.bootstrap.collapse', ['ui.bootstrap.transition'])

  .directive('collapse', ['$transition', function ($transition, $timeout) {

    return {
      link: function (scope, element, attrs) {

        var initialAnimSkip = true;
        var currentTransition;

        function doTransition(change) {
          var newTransition = $transition(element, change);
          if (currentTransition) {
            currentTransition.cancel();
          }
          currentTransition = newTransition;
          newTransition.then(newTransitionDone, newTransitionDone);
          return newTransition;

          function newTransitionDone() {
            // Make sure it's this transition, otherwise, leave it alone.
            if (currentTransition === newTransition) {
              currentTransition = undefined;
            }
          }
        }

        function expand() {
          if (initialAnimSkip) {
            initialAnimSkip = false;
            expandDone();
          } else {
            element.removeClass('collapse').addClass('collapsing');
            doTransition({ height: element[0].scrollHeight + 'px' }).then(expandDone);
          }
        }

        function expandDone() {
          element.removeClass('collapsing');
          element.addClass('collapse in');
          element.css({height: 'auto'});
        }

        function collapse() {
          if (initialAnimSkip) {
            initialAnimSkip = false;
            collapseDone();
            element.css({height: 0});
          } else {
            // CSS transitions don't work with height: auto, so we have to manually change the height to a specific value
            element.css({ height: element[0].scrollHeight + 'px' });
            //trigger reflow so a browser realizes that height was updated from auto to a specific value
            var x = element[0].offsetWidth;

            element.removeClass('collapse in').addClass('collapsing');

            doTransition({ height: 0 }).then(collapseDone);
          }
        }

        function collapseDone() {
          element.removeClass('collapsing');
          element.addClass('collapse');
        }

        scope.$watch(attrs.collapse, function (shouldCollapse) {
          if (shouldCollapse) {
            collapse();
          } else {
            expand();
          }
        });
      }
    };
  }]);

angular.module('ui.bootstrap.accordion', ['ui.bootstrap.collapse'])

.constant('accordionConfig', {
  closeOthers: true
})

.controller('AccordionController', ['$scope', '$attrs', 'accordionConfig', function ($scope, $attrs, accordionConfig) {

  // This array keeps track of the accordion groups
  this.groups = [];

  // Ensure that all the groups in this accordion are closed, unless close-others explicitly says not to
  this.closeOthers = function(openGroup) {
    var closeOthers = angular.isDefined($attrs.closeOthers) ? $scope.$eval($attrs.closeOthers) : accordionConfig.closeOthers;
    if ( closeOthers ) {
      angular.forEach(this.groups, function (group) {
        if ( group !== openGroup ) {
          group.isOpen = false;
        }
      });
    }
  };
  
  // This is called from the accordion-group directive to add itself to the accordion
  this.addGroup = function(groupScope) {
    var that = this;
    this.groups.push(groupScope);

    groupScope.$on('$destroy', function (event) {
      that.removeGroup(groupScope);
    });
  };

  // This is called from the accordion-group directive when to remove itself
  this.removeGroup = function(group) {
    var index = this.groups.indexOf(group);
    if ( index !== -1 ) {
      this.groups.splice(this.groups.indexOf(group), 1);
    }
  };

}])

// The accordion directive simply sets up the directive controller
// and adds an accordion CSS class to itself element.
.directive('accordion', function () {
  return {
    restrict:'EA',
    controller:'AccordionController',
    transclude: true,
    replace: false,
    templateUrl: 'template/accordion/accordion.html'
  };
})

// The accordion-group directive indicates a block of html that will expand and collapse in an accordion
.directive('accordionGroup', ['$parse', function($parse) {
  return {
    require:'^accordion',         // We need this directive to be inside an accordion
    restrict:'EA',
    transclude:true,              // It transcludes the contents of the directive into the template
    replace: true,                // The element containing the directive will be replaced with the template
    templateUrl:'template/accordion/accordion-group.html',
    scope:{ heading:'@' },        // Create an isolated scope and interpolate the heading attribute onto this scope
    controller: function() {
      this.setHeading = function(element) {
        this.heading = element;
      };
    },
    link: function(scope, element, attrs, accordionCtrl) {
      var getIsOpen, setIsOpen;

      accordionCtrl.addGroup(scope);

      scope.isOpen = false;
      
      if ( attrs.isOpen ) {
        getIsOpen = $parse(attrs.isOpen);
        setIsOpen = getIsOpen.assign;

        scope.$parent.$watch(getIsOpen, function(value) {
          scope.isOpen = !!value;
        });
      }

      scope.$watch('isOpen', function(value) {
        if ( value ) {
          accordionCtrl.closeOthers(scope);
        }
        if ( setIsOpen ) {
          setIsOpen(scope.$parent, value);
        }
      });
    }
  };
}])

// Use accordion-heading below an accordion-group to provide a heading containing HTML
// <accordion-group>
//   <accordion-heading>Heading containing HTML - <img src="..."></accordion-heading>
// </accordion-group>
.directive('accordionHeading', function() {
  return {
    restrict: 'EA',
    transclude: true,   // Grab the contents to be used as the heading
    template: '',       // In effect remove this element!
    replace: true,
    require: '^accordionGroup',
    compile: function(element, attr, transclude) {
      return function link(scope, element, attr, accordionGroupCtrl) {
        // Pass the heading to the accordion-group controller
        // so that it can be transcluded into the right place in the template
        // [The second parameter to transclude causes the elements to be cloned so that they work in ng-repeat]
        accordionGroupCtrl.setHeading(transclude(scope, function() {}));
      };
    }
  };
})

// Use in the accordion-group template to indicate where you want the heading to be transcluded
// You must provide the property on the accordion-group controller that will hold the transcluded element
// <div class="accordion-group">
//   <div class="accordion-heading" ><a ... accordion-transclude="heading">...</a></div>
//   ...
// </div>
.directive('accordionTransclude', function() {
  return {
    require: '^accordionGroup',
    link: function(scope, element, attr, controller) {
      scope.$watch(function() { return controller[attr.accordionTransclude]; }, function(heading) {
        if ( heading ) {
          element.html('');
          element.append(heading);
        }
      });
    }
  };
});

angular.module("ui.bootstrap.alert", [])

.controller('AlertController', ['$scope', '$attrs', function ($scope, $attrs) {
  $scope.closeable = 'close' in $attrs;
}])

.directive('alert', function () {
  return {
    restrict:'EA',
    controller:'AlertController',
    templateUrl:'template/alert/alert.html',
    transclude:true,
    replace:true,
    scope: {
      type: '=',
      close: '&'
    }
  };
});

angular.module('ui.bootstrap.bindHtml', [])

  .directive('bindHtmlUnsafe', function () {
    return function (scope, element, attr) {
      element.addClass('ng-binding').data('$binding', attr.bindHtmlUnsafe);
      scope.$watch(attr.bindHtmlUnsafe, function bindHtmlUnsafeWatchAction(value) {
        element.html(value || '');
      });
    };
  });
angular.module('ui.bootstrap.buttons', [])

.constant('buttonConfig', {
  activeClass: 'active',
  toggleEvent: 'click'
})

.controller('ButtonsController', ['buttonConfig', function(buttonConfig) {
  this.activeClass = buttonConfig.activeClass || 'active';
  this.toggleEvent = buttonConfig.toggleEvent || 'click';
}])

.directive('btnRadio', function () {
  return {
    require: ['btnRadio', 'ngModel'],
    controller: 'ButtonsController',
    link: function (scope, element, attrs, ctrls) {
      var buttonsCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      //model -> UI
      ngModelCtrl.$render = function () {
        element.toggleClass(buttonsCtrl.activeClass, angular.equals(ngModelCtrl.$modelValue, scope.$eval(attrs.btnRadio)));
      };

      //ui->model
      element.bind(buttonsCtrl.toggleEvent, function () {
        if (!element.hasClass(buttonsCtrl.activeClass)) {
          scope.$apply(function () {
            ngModelCtrl.$setViewValue(scope.$eval(attrs.btnRadio));
            ngModelCtrl.$render();
          });
        }
      });
    }
  };
})

.directive('btnCheckbox', function () {
  return {
    require: ['btnCheckbox', 'ngModel'],
    controller: 'ButtonsController',
    link: function (scope, element, attrs, ctrls) {
      var buttonsCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      function getTrueValue() {
        return getCheckboxValue(attrs.btnCheckboxTrue, true);
      }

      function getFalseValue() {
        return getCheckboxValue(attrs.btnCheckboxFalse, false);
      }
      
      function getCheckboxValue(attributeValue, defaultValue) {
        var val = scope.$eval(attributeValue);
        return angular.isDefined(val) ? val : defaultValue;
      }

      //model -> UI
      ngModelCtrl.$render = function () {
        element.toggleClass(buttonsCtrl.activeClass, angular.equals(ngModelCtrl.$modelValue, getTrueValue()));
      };

      //ui->model
      element.bind(buttonsCtrl.toggleEvent, function () {
        scope.$apply(function () {
          ngModelCtrl.$setViewValue(element.hasClass(buttonsCtrl.activeClass) ? getFalseValue() : getTrueValue());
          ngModelCtrl.$render();
        });
      });
    }
  };
});

/**
* @ngdoc overview
* @name ui.bootstrap.carousel
*
* @description
* AngularJS version of an image carousel.
*
*/
angular.module('ui.bootstrap.carousel', ['ui.bootstrap.transition'])
.controller('CarouselController', ['$scope', '$timeout', '$transition', '$q', function ($scope, $timeout, $transition, $q) {
  var self = this,
    slides = self.slides = [],
    currentIndex = -1,
    currentTimeout, isPlaying;
  self.currentSlide = null;

  var destroyed = false;
  /* direction: "prev" or "next" */
  self.select = function(nextSlide, direction) {
    var nextIndex = slides.indexOf(nextSlide);
    //Decide direction if it's not given
    if (direction === undefined) {
      direction = nextIndex > currentIndex ? "next" : "prev";
    }
    if (nextSlide && nextSlide !== self.currentSlide) {
      if ($scope.$currentTransition) {
        $scope.$currentTransition.cancel();
        //Timeout so ng-class in template has time to fix classes for finished slide
        $timeout(goNext);
      } else {
        goNext();
      }
    }
    function goNext() {
      // Scope has been destroyed, stop here.
      if (destroyed) { return; }
      //If we have a slide to transition from and we have a transition type and we're allowed, go
      if (self.currentSlide && angular.isString(direction) && !$scope.noTransition && nextSlide.$element) {
        //We shouldn't do class manip in here, but it's the same weird thing bootstrap does. need to fix sometime
        nextSlide.$element.addClass(direction);
        var reflow = nextSlide.$element[0].offsetWidth; //force reflow

        //Set all other slides to stop doing their stuff for the new transition
        angular.forEach(slides, function(slide) {
          angular.extend(slide, {direction: '', entering: false, leaving: false, active: false});
        });
        angular.extend(nextSlide, {direction: direction, active: true, entering: true});
        angular.extend(self.currentSlide||{}, {direction: direction, leaving: true});

        $scope.$currentTransition = $transition(nextSlide.$element, {});
        //We have to create new pointers inside a closure since next & current will change
        (function(next,current) {
          $scope.$currentTransition.then(
            function(){ transitionDone(next, current); },
            function(){ transitionDone(next, current); }
          );
        }(nextSlide, self.currentSlide));
      } else {
        transitionDone(nextSlide, self.currentSlide);
      }
      self.currentSlide = nextSlide;
      currentIndex = nextIndex;
      //every time you change slides, reset the timer
      restartTimer();
    }
    function transitionDone(next, current) {
      angular.extend(next, {direction: '', active: true, leaving: false, entering: false});
      angular.extend(current||{}, {direction: '', active: false, leaving: false, entering: false});
      $scope.$currentTransition = null;
    }
  };
  $scope.$on('$destroy', function () {
    destroyed = true;
  });

  /* Allow outside people to call indexOf on slides array */
  self.indexOfSlide = function(slide) {
    return slides.indexOf(slide);
  };

  $scope.next = function() {
    var newIndex = (currentIndex + 1) % slides.length;

    //Prevent this user-triggered transition from occurring if there is already one in progress
    if (!$scope.$currentTransition) {
      return self.select(slides[newIndex], 'next');
    }
  };

  $scope.prev = function() {
    var newIndex = currentIndex - 1 < 0 ? slides.length - 1 : currentIndex - 1;

    //Prevent this user-triggered transition from occurring if there is already one in progress
    if (!$scope.$currentTransition) {
      return self.select(slides[newIndex], 'prev');
    }
  };

  $scope.select = function(slide) {
    self.select(slide);
  };

  $scope.isActive = function(slide) {
     return self.currentSlide === slide;
  };

  $scope.slides = function() {
    return slides;
  };

  $scope.$watch('interval', restartTimer);
  $scope.$on('$destroy', resetTimer);

  function restartTimer() {
    resetTimer();
    var interval = +$scope.interval;
    if (!isNaN(interval) && interval>=0) {
      currentTimeout = $timeout(timerFn, interval);
    }
  }

  function resetTimer() {
    if (currentTimeout) {
      $timeout.cancel(currentTimeout);
      currentTimeout = null;
    }
  }

  function timerFn() {
    if (isPlaying) {
      $scope.next();
      restartTimer();
    } else {
      $scope.pause();
    }
  }

  $scope.play = function() {
    if (!isPlaying) {
      isPlaying = true;
      restartTimer();
    }
  };
  $scope.pause = function() {
    if (!$scope.noPause) {
      isPlaying = false;
      resetTimer();
    }
  };

  self.addSlide = function(slide, element) {
    slide.$element = element;
    slides.push(slide);
    //if this is the first slide or the slide is set to active, select it
    if(slides.length === 1 || slide.active) {
      self.select(slides[slides.length-1]);
      if (slides.length == 1) {
        $scope.play();
      }
    } else {
      slide.active = false;
    }
  };

  self.removeSlide = function(slide) {
    //get the index of the slide inside the carousel
    var index = slides.indexOf(slide);
    slides.splice(index, 1);
    if (slides.length > 0 && slide.active) {
      if (index >= slides.length) {
        self.select(slides[index-1]);
      } else {
        self.select(slides[index]);
      }
    } else if (currentIndex > index) {
      currentIndex--;
    }
  };

}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.carousel.directive:carousel
 * @restrict EA
 *
 * @description
 * Carousel is the outer container for a set of image 'slides' to showcase.
 *
 * @param {number=} interval The time, in milliseconds, that it will take the carousel to go to the next slide.
 * @param {boolean=} noTransition Whether to disable transitions on the carousel.
 * @param {boolean=} noPause Whether to disable pausing on the carousel (by default, the carousel interval pauses on hover).
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <carousel>
      <slide>
        <img src="http://placekitten.com/150/150" style="margin:auto;">
        <div class="carousel-caption">
          <p>Beautiful!</p>
        </div>
      </slide>
      <slide>
        <img src="http://placekitten.com/100/150" style="margin:auto;">
        <div class="carousel-caption">
          <p>D'aww!</p>
        </div>
      </slide>
    </carousel>
  </file>
  <file name="demo.css">
    .carousel-indicators {
      top: auto;
      bottom: 15px;
    }
  </file>
</example>
 */
.directive('carousel', [function() {
  return {
    restrict: 'EA',
    transclude: true,
    replace: true,
    controller: 'CarouselController',
    require: 'carousel',
    templateUrl: 'template/carousel/carousel.html',
    scope: {
      interval: '=',
      noTransition: '=',
      noPause: '='
    }
  };
}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.carousel.directive:slide
 * @restrict EA
 *
 * @description
 * Creates a slide inside a {@link ui.bootstrap.carousel.directive:carousel carousel}.  Must be placed as a child of a carousel element.
 *
 * @param {boolean=} active Model binding, whether or not this slide is currently active.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
<div ng-controller="CarouselDemoCtrl">
  <carousel>
    <slide ng-repeat="slide in slides" active="slide.active">
      <img ng-src="{{slide.image}}" style="margin:auto;">
      <div class="carousel-caption">
        <h4>Slide {{$index}}</h4>
        <p>{{slide.text}}</p>
      </div>
    </slide>
  </carousel>
  <div class="row-fluid">
    <div class="span6">
      <ul>
        <li ng-repeat="slide in slides">
          <button class="btn btn-mini" ng-class="{'btn-info': !slide.active, 'btn-success': slide.active}" ng-disabled="slide.active" ng-click="slide.active = true">select</button>
          {{$index}}: {{slide.text}}
        </li>
      </ul>
      <a class="btn" ng-click="addSlide()">Add Slide</a>
    </div>
    <div class="span6">
      Interval, in milliseconds: <input type="number" ng-model="myInterval">
      <br />Enter a negative number to stop the interval.
    </div>
  </div>
</div>
  </file>
  <file name="script.js">
function CarouselDemoCtrl($scope) {
  $scope.myInterval = 5000;
  var slides = $scope.slides = [];
  $scope.addSlide = function() {
    var newWidth = 200 + ((slides.length + (25 * slides.length)) % 150);
    slides.push({
      image: 'http://placekitten.com/' + newWidth + '/200',
      text: ['More','Extra','Lots of','Surplus'][slides.length % 4] + ' '
        ['Cats', 'Kittys', 'Felines', 'Cutes'][slides.length % 4]
    });
  };
  for (var i=0; i<4; i++) $scope.addSlide();
}
  </file>
  <file name="demo.css">
    .carousel-indicators {
      top: auto;
      bottom: 15px;
    }
  </file>
</example>
*/

.directive('slide', ['$parse', function($parse) {
  return {
    require: '^carousel',
    restrict: 'EA',
    transclude: true,
    replace: true,
    templateUrl: 'template/carousel/slide.html',
    scope: {
    },
    link: function (scope, element, attrs, carouselCtrl) {
      //Set up optional 'active' = binding
      if (attrs.active) {
        var getActive = $parse(attrs.active);
        var setActive = getActive.assign;
        var lastValue = scope.active = getActive(scope.$parent);
        scope.$watch(function parentActiveWatch() {
          var parentActive = getActive(scope.$parent);

          if (parentActive !== scope.active) {
            // we are out of sync and need to copy
            if (parentActive !== lastValue) {
              // parent changed and it has precedence
              lastValue = scope.active = parentActive;
            } else {
              // if the parent can be assigned then do so
              setActive(scope.$parent, parentActive = lastValue = scope.active);
            }
          }
          return parentActive;
        });
      }

      carouselCtrl.addSlide(scope, element);
      //when the scope is destroyed then remove the slide from the current slides array
      scope.$on('$destroy', function() {
        carouselCtrl.removeSlide(scope);
      });

      scope.$watch('active', function(active) {
        if (active) {
          carouselCtrl.select(scope);
        }
      });
    }
  };
}]);

angular.module('ui.bootstrap.position', [])

/**
 * A set of utility methods that can be use to retrieve position of DOM elements.
 * It is meant to be used where we need to absolute-position DOM elements in
 * relation to other, existing elements (this is the case for tooltips, popovers,
 * typeahead suggestions etc.).
 */
  .factory('$position', ['$document', '$window', function ($document, $window) {

    function getStyle(el, cssprop) {
      if (el.currentStyle) { //IE
        return el.currentStyle[cssprop];
      } else if ($window.getComputedStyle) {
        return $window.getComputedStyle(el)[cssprop];
      }
      // finally try and get inline style
      return el.style[cssprop];
    }

    /**
     * Checks if a given element is statically positioned
     * @param element - raw DOM element
     */
    function isStaticPositioned(element) {
      return (getStyle(element, "position") || 'static' ) === 'static';
    }

    /**
     * returns the closest, non-statically positioned parentOffset of a given element
     * @param element
     */
    var parentOffsetEl = function (element) {
      var docDomEl = $document[0];
      var offsetParent = element.offsetParent || docDomEl;
      while (offsetParent && offsetParent !== docDomEl && isStaticPositioned(offsetParent) ) {
        offsetParent = offsetParent.offsetParent;
      }
      return offsetParent || docDomEl;
    };

    return {
      /**
       * Provides read-only equivalent of jQuery's position function:
       * http://api.jquery.com/position/
       */
      position: function (element) {
        var elBCR = this.offset(element);
        var offsetParentBCR = { top: 0, left: 0 };
        var offsetParentEl = parentOffsetEl(element[0]);
        if (offsetParentEl != $document[0]) {
          offsetParentBCR = this.offset(angular.element(offsetParentEl));
          offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
          offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
        }

        var boundingClientRect = element[0].getBoundingClientRect();
        return {
          width: boundingClientRect.width || element.prop('offsetWidth'),
          height: boundingClientRect.height || element.prop('offsetHeight'),
          top: elBCR.top - offsetParentBCR.top,
          left: elBCR.left - offsetParentBCR.left
        };
      },

      /**
       * Provides read-only equivalent of jQuery's offset function:
       * http://api.jquery.com/offset/
       */
      offset: function (element) {
        var boundingClientRect = element[0].getBoundingClientRect();
        return {
          width: boundingClientRect.width || element.prop('offsetWidth'),
          height: boundingClientRect.height || element.prop('offsetHeight'),
          top: boundingClientRect.top + ($window.pageYOffset || $document[0].body.scrollTop || $document[0].documentElement.scrollTop),
          left: boundingClientRect.left + ($window.pageXOffset || $document[0].body.scrollLeft  || $document[0].documentElement.scrollLeft)
        };
      }
    };
  }]);

angular.module('ui.bootstrap.datepicker', ['ui.bootstrap.position'])

.constant('datepickerConfig', {
  dayFormat: 'dd',
  monthFormat: 'MMMM',
  yearFormat: 'yyyy',
  dayHeaderFormat: 'EEE',
  dayTitleFormat: 'MMMM yyyy',
  monthTitleFormat: 'yyyy',
  showWeeks: true,
  startingDay: 0,
  yearRange: 20,
  minDate: null,
  maxDate: null
})

.controller('DatepickerController', ['$scope', '$attrs', 'dateFilter', 'datepickerConfig', function($scope, $attrs, dateFilter, dtConfig) {
  var format = {
    day:        getValue($attrs.dayFormat,        dtConfig.dayFormat),
    month:      getValue($attrs.monthFormat,      dtConfig.monthFormat),
    year:       getValue($attrs.yearFormat,       dtConfig.yearFormat),
    dayHeader:  getValue($attrs.dayHeaderFormat,  dtConfig.dayHeaderFormat),
    dayTitle:   getValue($attrs.dayTitleFormat,   dtConfig.dayTitleFormat),
    monthTitle: getValue($attrs.monthTitleFormat, dtConfig.monthTitleFormat)
  },
  startingDay = getValue($attrs.startingDay,      dtConfig.startingDay),
  yearRange =   getValue($attrs.yearRange,        dtConfig.yearRange);

  this.minDate = dtConfig.minDate ? new Date(dtConfig.minDate) : null;
  this.maxDate = dtConfig.maxDate ? new Date(dtConfig.maxDate) : null;

  function getValue(value, defaultValue) {
    return angular.isDefined(value) ? $scope.$parent.$eval(value) : defaultValue;
  }

  function getDaysInMonth( year, month ) {
    return new Date(year, month, 0).getDate();
  }

  function getDates(startDate, n) {
    var dates = new Array(n);
    var current = startDate, i = 0;
    while (i < n) {
      dates[i++] = new Date(current);
      current.setDate( current.getDate() + 1 );
    }
    return dates;
  }

  function makeDate(date, format, isSelected, isSecondary) {
    return { date: date, label: dateFilter(date, format), selected: !!isSelected, secondary: !!isSecondary };
  }

  this.modes = [
    {
      name: 'day',
      getVisibleDates: function(date, selected) {
        var year = date.getFullYear(), month = date.getMonth(), firstDayOfMonth = new Date(year, month, 1);
        var difference = startingDay - firstDayOfMonth.getDay(),
        numDisplayedFromPreviousMonth = (difference > 0) ? 7 - difference : - difference,
        firstDate = new Date(firstDayOfMonth), numDates = 0;

        if ( numDisplayedFromPreviousMonth > 0 ) {
          firstDate.setDate( - numDisplayedFromPreviousMonth + 1 );
          numDates += numDisplayedFromPreviousMonth; // Previous
        }
        numDates += getDaysInMonth(year, month + 1); // Current
        numDates += (7 - numDates % 7) % 7; // Next

        var days = getDates(firstDate, numDates), labels = new Array(7);
        for (var i = 0; i < numDates; i ++) {
          var dt = new Date(days[i]);
          days[i] = makeDate(dt, format.day, (selected && selected.getDate() === dt.getDate() && selected.getMonth() === dt.getMonth() && selected.getFullYear() === dt.getFullYear()), dt.getMonth() !== month);
        }
        for (var j = 0; j < 7; j++) {
          labels[j] = dateFilter(days[j].date, format.dayHeader);
        }
        return { objects: days, title: dateFilter(date, format.dayTitle), labels: labels };
      },
      compare: function(date1, date2) {
        return (new Date( date1.getFullYear(), date1.getMonth(), date1.getDate() ) - new Date( date2.getFullYear(), date2.getMonth(), date2.getDate() ) );
      },
      split: 7,
      step: { months: 1 }
    },
    {
      name: 'month',
      getVisibleDates: function(date, selected) {
        var months = new Array(12), year = date.getFullYear();
        for ( var i = 0; i < 12; i++ ) {
          var dt = new Date(year, i, 1);
          months[i] = makeDate(dt, format.month, (selected && selected.getMonth() === i && selected.getFullYear() === year));
        }
        return { objects: months, title: dateFilter(date, format.monthTitle) };
      },
      compare: function(date1, date2) {
        return new Date( date1.getFullYear(), date1.getMonth() ) - new Date( date2.getFullYear(), date2.getMonth() );
      },
      split: 3,
      step: { years: 1 }
    },
    {
      name: 'year',
      getVisibleDates: function(date, selected) {
        var years = new Array(yearRange), year = date.getFullYear(), startYear = parseInt((year - 1) / yearRange, 10) * yearRange + 1;
        for ( var i = 0; i < yearRange; i++ ) {
          var dt = new Date(startYear + i, 0, 1);
          years[i] = makeDate(dt, format.year, (selected && selected.getFullYear() === dt.getFullYear()));
        }
        return { objects: years, title: [years[0].label, years[yearRange - 1].label].join(' - ') };
      },
      compare: function(date1, date2) {
        return date1.getFullYear() - date2.getFullYear();
      },
      split: 5,
      step: { years: yearRange }
    }
  ];

  this.isDisabled = function(date, mode) {
    var currentMode = this.modes[mode || 0];
    return ((this.minDate && currentMode.compare(date, this.minDate) < 0) || (this.maxDate && currentMode.compare(date, this.maxDate) > 0) || ($scope.dateDisabled && $scope.dateDisabled({date: date, mode: currentMode.name})));
  };
}])

.directive( 'datepicker', ['dateFilter', '$parse', 'datepickerConfig', '$log', function (dateFilter, $parse, datepickerConfig, $log) {
  return {
    restrict: 'EA',
    replace: true,
    templateUrl: 'template/datepicker/datepicker.html',
    scope: {
      dateDisabled: '&'
    },
    require: ['datepicker', '?^ngModel'],
    controller: 'DatepickerController',
    link: function(scope, element, attrs, ctrls) {
      var datepickerCtrl = ctrls[0], ngModel = ctrls[1];

      if (!ngModel) {
        return; // do nothing if no ng-model
      }

      // Configuration parameters
      var mode = 0, selected = new Date(), showWeeks = datepickerConfig.showWeeks;

      if (attrs.showWeeks) {
        scope.$parent.$watch($parse(attrs.showWeeks), function(value) {
          showWeeks = !! value;
          updateShowWeekNumbers();
        });
      } else {
        updateShowWeekNumbers();
      }

      if (attrs.min) {
        scope.$parent.$watch($parse(attrs.min), function(value) {
          datepickerCtrl.minDate = value ? new Date(value) : null;
          refill();
        });
      }
      if (attrs.max) {
        scope.$parent.$watch($parse(attrs.max), function(value) {
          datepickerCtrl.maxDate = value ? new Date(value) : null;
          refill();
        });
      }

      function updateShowWeekNumbers() {
        scope.showWeekNumbers = mode === 0 && showWeeks;
      }

      // Split array into smaller arrays
      function split(arr, size) {
        var arrays = [];
        while (arr.length > 0) {
          arrays.push(arr.splice(0, size));
        }
        return arrays;
      }

      function refill( updateSelected ) {
        var date = null, valid = true;

        if ( ngModel.$modelValue ) {
          date = new Date( ngModel.$modelValue );

          if ( isNaN(date) ) {
            valid = false;
            $log.error('Datepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
          } else if ( updateSelected ) {
            selected = date;
          }
        }
        ngModel.$setValidity('date', valid);

        var currentMode = datepickerCtrl.modes[mode], data = currentMode.getVisibleDates(selected, date);
        angular.forEach(data.objects, function(obj) {
          obj.disabled = datepickerCtrl.isDisabled(obj.date, mode);
        });

        ngModel.$setValidity('date-disabled', (!date || !datepickerCtrl.isDisabled(date)));

        scope.rows = split(data.objects, currentMode.split);
        scope.labels = data.labels || [];
        scope.title = data.title;
      }

      function setMode(value) {
        mode = value;
        updateShowWeekNumbers();
        refill();
      }

      ngModel.$render = function() {
        refill( true );
      };

      scope.select = function( date ) {
        if ( mode === 0 ) {
          var dt = ngModel.$modelValue ? new Date( ngModel.$modelValue ) : new Date(0, 0, 0, 0, 0, 0, 0);
          dt.setFullYear( date.getFullYear(), date.getMonth(), date.getDate() );
          ngModel.$setViewValue( dt );
          refill( true );
        } else {
          selected = date;
          setMode( mode - 1 );
        }
      };
      scope.move = function(direction) {
        var step = datepickerCtrl.modes[mode].step;
        selected.setMonth( selected.getMonth() + direction * (step.months || 0) );
        selected.setFullYear( selected.getFullYear() + direction * (step.years || 0) );
        refill();
      };
      scope.toggleMode = function() {
        setMode( (mode + 1) % datepickerCtrl.modes.length );
      };
      scope.getWeekNumber = function(row) {
        return ( mode === 0 && scope.showWeekNumbers && row.length === 7 ) ? getISO8601WeekNumber(row[0].date) : null;
      };

      function getISO8601WeekNumber(date) {
        var checkDate = new Date(date);
        checkDate.setDate(checkDate.getDate() + 4 - (checkDate.getDay() || 7)); // Thursday
        var time = checkDate.getTime();
        checkDate.setMonth(0); // Compare with Jan 1
        checkDate.setDate(1);
        return Math.floor(Math.round((time - checkDate) / 86400000) / 7) + 1;
      }
    }
  };
}])

.constant('datepickerPopupConfig', {
  dateFormat: 'yyyy-MM-dd',
  currentText: 'Today',
  toggleWeeksText: 'Weeks',
  clearText: 'Clear',
  closeText: 'Done',
  closeOnDateSelection: true,
  appendToBody: false,
  showButtonBar: true
})

.directive('datepickerPopup', ['$compile', '$parse', '$document', '$position', 'dateFilter', 'datepickerPopupConfig', 'datepickerConfig',
function ($compile, $parse, $document, $position, dateFilter, datepickerPopupConfig, datepickerConfig) {
  return {
    restrict: 'EA',
    require: 'ngModel',
    link: function(originalScope, element, attrs, ngModel) {
      var scope = originalScope.$new(), // create a child scope so we are not polluting original one
          dateFormat,
          closeOnDateSelection = angular.isDefined(attrs.closeOnDateSelection) ? originalScope.$eval(attrs.closeOnDateSelection) : datepickerPopupConfig.closeOnDateSelection,
          appendToBody = angular.isDefined(attrs.datepickerAppendToBody) ? originalScope.$eval(attrs.datepickerAppendToBody) : datepickerPopupConfig.appendToBody;

      attrs.$observe('datepickerPopup', function(value) {
          dateFormat = value || datepickerPopupConfig.dateFormat;
          ngModel.$render();
      });

      scope.showButtonBar = angular.isDefined(attrs.showButtonBar) ? originalScope.$eval(attrs.showButtonBar) : datepickerPopupConfig.showButtonBar;

      originalScope.$on('$destroy', function() {
        $popup.remove();
        scope.$destroy();
      });

      attrs.$observe('currentText', function(text) {
        scope.currentText = angular.isDefined(text) ? text : datepickerPopupConfig.currentText;
      });
      attrs.$observe('toggleWeeksText', function(text) {
        scope.toggleWeeksText = angular.isDefined(text) ? text : datepickerPopupConfig.toggleWeeksText;
      });
      attrs.$observe('clearText', function(text) {
        scope.clearText = angular.isDefined(text) ? text : datepickerPopupConfig.clearText;
      });
      attrs.$observe('closeText', function(text) {
        scope.closeText = angular.isDefined(text) ? text : datepickerPopupConfig.closeText;
      });

      var getIsOpen, setIsOpen;
      if ( attrs.isOpen ) {
        getIsOpen = $parse(attrs.isOpen);
        setIsOpen = getIsOpen.assign;

        originalScope.$watch(getIsOpen, function updateOpen(value) {
          scope.isOpen = !! value;
        });
      }
      scope.isOpen = getIsOpen ? getIsOpen(originalScope) : false; // Initial state

      function setOpen( value ) {
        if (setIsOpen) {
          setIsOpen(originalScope, !!value);
        } else {
          scope.isOpen = !!value;
        }
      }

      var documentClickBind = function(event) {
        if (scope.isOpen && event.target !== element[0]) {
          scope.$apply(function() {
            setOpen(false);
          });
        }
      };

      var elementFocusBind = function() {
        scope.$apply(function() {
          setOpen( true );
        });
      };

      // popup element used to display calendar
      var popupEl = angular.element('<div datepicker-popup-wrap><div datepicker></div></div>');
      popupEl.attr({
        'ng-model': 'date',
        'ng-change': 'dateSelection()'
      });
      var datepickerEl = angular.element(popupEl.children()[0]),
          datepickerOptions = {};
      if (attrs.datepickerOptions) {
        datepickerOptions = originalScope.$eval(attrs.datepickerOptions);
        datepickerEl.attr(angular.extend({}, datepickerOptions));
      }

      // TODO: reverse from dateFilter string to Date object
      function parseDate(viewValue) {
        if (!viewValue) {
          ngModel.$setValidity('date', true);
          return null;
        } else if (angular.isDate(viewValue)) {
          ngModel.$setValidity('date', true);
          return viewValue;
        } else if (angular.isString(viewValue)) {
          var date = new Date(viewValue);
          if (isNaN(date)) {
            ngModel.$setValidity('date', false);
            return undefined;
          } else {
            ngModel.$setValidity('date', true);
            return date;
          }
        } else {
          ngModel.$setValidity('date', false);
          return undefined;
        }
      }
      ngModel.$parsers.unshift(parseDate);

      // Inner change
      scope.dateSelection = function(dt) {
        if (angular.isDefined(dt)) {
          scope.date = dt;
        }
        ngModel.$setViewValue(scope.date);
        ngModel.$render();

        if (closeOnDateSelection) {
          setOpen( false );
        }
      };

      element.bind('input change keyup', function() {
        scope.$apply(function() {
          scope.date = ngModel.$modelValue;
        });
      });

      // Outter change
      ngModel.$render = function() {
        var date = ngModel.$viewValue ? dateFilter(ngModel.$viewValue, dateFormat) : '';
        element.val(date);
        scope.date = ngModel.$modelValue;
      };

      function addWatchableAttribute(attribute, scopeProperty, datepickerAttribute) {
        if (attribute) {
          originalScope.$watch($parse(attribute), function(value){
            scope[scopeProperty] = value;
          });
          datepickerEl.attr(datepickerAttribute || scopeProperty, scopeProperty);
        }
      }
      addWatchableAttribute(attrs.min, 'min');
      addWatchableAttribute(attrs.max, 'max');
      if (attrs.showWeeks) {
        addWatchableAttribute(attrs.showWeeks, 'showWeeks', 'show-weeks');
      } else {
        scope.showWeeks = 'show-weeks' in datepickerOptions ? datepickerOptions['show-weeks'] : datepickerConfig.showWeeks;
        datepickerEl.attr('show-weeks', 'showWeeks');
      }
      if (attrs.dateDisabled) {
        datepickerEl.attr('date-disabled', attrs.dateDisabled);
      }

      function updatePosition() {
        scope.position = appendToBody ? $position.offset(element) : $position.position(element);
        scope.position.top = scope.position.top + element.prop('offsetHeight');
      }

      var documentBindingInitialized = false, elementFocusInitialized = false;
      scope.$watch('isOpen', function(value) {
        if (value) {
          updatePosition();
          $document.bind('click', documentClickBind);
          if(elementFocusInitialized) {
            element.unbind('focus', elementFocusBind);
          }
          element[0].focus();
          documentBindingInitialized = true;
        } else {
          if(documentBindingInitialized) {
            $document.unbind('click', documentClickBind);
          }
          element.bind('focus', elementFocusBind);
          elementFocusInitialized = true;
        }

        if ( setIsOpen ) {
          setIsOpen(originalScope, value);
        }
      });

      scope.today = function() {
        scope.dateSelection(new Date());
      };
      scope.clear = function() {
        scope.dateSelection(null);
      };

      var $popup = $compile(popupEl)(scope);
      if ( appendToBody ) {
        $document.find('body').append($popup);
      } else {
        element.after($popup);
      }
    }
  };
}])

.directive('datepickerPopupWrap', function() {
  return {
    restrict:'EA',
    replace: true,
    transclude: true,
    templateUrl: 'template/datepicker/popup.html',
    link:function (scope, element, attrs) {
      element.bind('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
      });
    }
  };
});

/*
 * dropdownToggle - Provides dropdown menu functionality in place of bootstrap js
 * @restrict class or attribute
 * @example:
   <li class="dropdown">
     <a class="dropdown-toggle">My Dropdown Menu</a>
     <ul class="dropdown-menu">
       <li ng-repeat="choice in dropChoices">
         <a ng-href="{{choice.href}}">{{choice.text}}</a>
       </li>
     </ul>
   </li>
 */

angular.module('ui.bootstrap.dropdownToggle', []).directive('dropdownToggle', ['$document', '$location', function ($document, $location) {
  var openElement = null,
      closeMenu   = angular.noop;
  return {
    restrict: 'CA',
    link: function(scope, element, attrs) {
      scope.$watch('$location.path', function() { closeMenu(); });
      element.parent().bind('click', function() { closeMenu(); });
      element.bind('click', function (event) {

        var elementWasOpen = (element === openElement);

        event.preventDefault();
        event.stopPropagation();

        if (!!openElement) {
          closeMenu();
        }

        if (!elementWasOpen && !element.hasClass('disabled') && !element.prop('disabled')) {
          element.parent().addClass('open');
          openElement = element;
          closeMenu = function (event) {
            if (event) {
              event.preventDefault();
              event.stopPropagation();
            }
            $document.unbind('click', closeMenu);
            element.parent().removeClass('open');
            closeMenu = angular.noop;
            openElement = null;
          };
          $document.bind('click', closeMenu);
        }
      });
    }
  };
}]);

angular.module('ui.bootstrap.modal', ['ui.bootstrap.transition'])

/**
 * A helper, internal data structure that acts as a map but also allows getting / removing
 * elements in the LIFO order
 */
  .factory('$$stackedMap', function () {
    return {
      createNew: function () {
        var stack = [];

        return {
          add: function (key, value) {
            stack.push({
              key: key,
              value: value
            });
          },
          get: function (key) {
            for (var i = 0; i < stack.length; i++) {
              if (key == stack[i].key) {
                return stack[i];
              }
            }
          },
          keys: function() {
            var keys = [];
            for (var i = 0; i < stack.length; i++) {
              keys.push(stack[i].key);
            }
            return keys;
          },
          top: function () {
            return stack[stack.length - 1];
          },
          remove: function (key) {
            var idx = -1;
            for (var i = 0; i < stack.length; i++) {
              if (key == stack[i].key) {
                idx = i;
                break;
              }
            }
            return stack.splice(idx, 1)[0];
          },
          removeTop: function () {
            return stack.splice(stack.length - 1, 1)[0];
          },
          length: function () {
            return stack.length;
          }
        };
      }
    };
  })

/**
 * A helper directive for the $modal service. It creates a backdrop element.
 */
  .directive('modalBackdrop', ['$timeout', function ($timeout) {
    return {
      restrict: 'EA',
      replace: true,
      templateUrl: 'template/modal/backdrop.html',
      link: function (scope) {

        scope.animate = false;

        //trigger CSS transitions
        $timeout(function () {
          scope.animate = true;
        });
      }
    };
  }])

  .directive('modalWindow', ['$modalStack', '$timeout', function ($modalStack, $timeout) {
    return {
      restrict: 'EA',
      scope: {
        index: '@',
        animate: '='
      },
      replace: true,
      transclude: true,
      templateUrl: 'template/modal/window.html',
      link: function (scope, element, attrs) {
        scope.windowClass = attrs.windowClass || '';

        $timeout(function () {
          // trigger CSS transitions
          scope.animate = true;
          // focus a freshly-opened modal
          element[0].focus();
        });

        scope.close = function (evt) {
          var modal = $modalStack.getTop();
          if (modal && modal.value.backdrop && modal.value.backdrop != 'static' && (evt.target === evt.currentTarget)) {
            evt.preventDefault();
            evt.stopPropagation();
            $modalStack.dismiss(modal.key, 'backdrop click');
          }
        };
      }
    };
  }])

  .factory('$modalStack', ['$transition', '$timeout', '$document', '$compile', '$rootScope', '$$stackedMap',
    function ($transition, $timeout, $document, $compile, $rootScope, $$stackedMap) {

      var OPENED_MODAL_CLASS = 'modal-open';

      var backdropDomEl, backdropScope;
      var openedWindows = $$stackedMap.createNew();
      var $modalStack = {};

      function backdropIndex() {
        var topBackdropIndex = -1;
        var opened = openedWindows.keys();
        for (var i = 0; i < opened.length; i++) {
          if (openedWindows.get(opened[i]).value.backdrop) {
            topBackdropIndex = i;
          }
        }
        return topBackdropIndex;
      }

      $rootScope.$watch(backdropIndex, function(newBackdropIndex){
        if (backdropScope) {
          backdropScope.index = newBackdropIndex;
        }
      });

      function removeModalWindow(modalInstance) {

        var body = $document.find('body').eq(0);
        var modalWindow = openedWindows.get(modalInstance).value;

        //clean up the stack
        openedWindows.remove(modalInstance);

        //remove window DOM element
        removeAfterAnimate(modalWindow.modalDomEl, modalWindow.modalScope, 300, checkRemoveBackdrop);
        body.toggleClass(OPENED_MODAL_CLASS, openedWindows.length() > 0);
      }

      function checkRemoveBackdrop() {
          //remove backdrop if no longer needed
          if (backdropDomEl && backdropIndex() == -1) {
            var backdropScopeRef = backdropScope;
            removeAfterAnimate(backdropDomEl, backdropScope, 150, function () {
              backdropScopeRef.$destroy();
              backdropScopeRef = null;
            });
            backdropDomEl = undefined;
            backdropScope = undefined;
          }
      }

      function removeAfterAnimate(domEl, scope, emulateTime, done) {
        // Closing animation
        scope.animate = false;

        var transitionEndEventName = $transition.transitionEndEventName;
        if (transitionEndEventName) {
          // transition out
          var timeout = $timeout(afterAnimating, emulateTime);

          domEl.bind(transitionEndEventName, function () {
            $timeout.cancel(timeout);
            afterAnimating();
            scope.$apply();
          });
        } else {
          // Ensure this call is async
          $timeout(afterAnimating, 0);
        }

        function afterAnimating() {
          if (afterAnimating.done) {
            return;
          }
          afterAnimating.done = true;

          domEl.remove();
          if (done) {
            done();
          }
        }
      }

      $document.bind('keydown', function (evt) {
        var modal;

        if (evt.which === 27) {
          modal = openedWindows.top();
          if (modal && modal.value.keyboard) {
            $rootScope.$apply(function () {
              $modalStack.dismiss(modal.key);
            });
          }
        }
      });

      $modalStack.open = function (modalInstance, modal) {

        openedWindows.add(modalInstance, {
          deferred: modal.deferred,
          modalScope: modal.scope,
          backdrop: modal.backdrop,
          keyboard: modal.keyboard
        });

        var body = $document.find('body').eq(0),
            currBackdropIndex = backdropIndex();

        if (currBackdropIndex >= 0 && !backdropDomEl) {
          backdropScope = $rootScope.$new(true);
          backdropScope.index = currBackdropIndex;
          backdropDomEl = $compile('<div modal-backdrop></div>')(backdropScope);
          body.append(backdropDomEl);
        }
          
        var angularDomEl = angular.element('<div modal-window></div>');
        angularDomEl.attr('window-class', modal.windowClass);
        angularDomEl.attr('index', openedWindows.length() - 1);
        angularDomEl.attr('animate', 'animate');
        angularDomEl.html(modal.content);

        var modalDomEl = $compile(angularDomEl)(modal.scope);
        openedWindows.top().value.modalDomEl = modalDomEl;
        body.append(modalDomEl);
        body.addClass(OPENED_MODAL_CLASS);
      };

      $modalStack.close = function (modalInstance, result) {
        var modalWindow = openedWindows.get(modalInstance).value;
        if (modalWindow) {
          modalWindow.deferred.resolve(result);
          removeModalWindow(modalInstance);
        }
      };

      $modalStack.dismiss = function (modalInstance, reason) {
        var modalWindow = openedWindows.get(modalInstance).value;
        if (modalWindow) {
          modalWindow.deferred.reject(reason);
          removeModalWindow(modalInstance);
        }
      };

      $modalStack.dismissAll = function (reason) {
        var topModal = this.getTop();
        while (topModal) {
          this.dismiss(topModal.key, reason);
          topModal = this.getTop();
        }
      };

      $modalStack.getTop = function () {
        return openedWindows.top();
      };

      return $modalStack;
    }])

  .provider('$modal', function () {

    var $modalProvider = {
      options: {
        backdrop: true, //can be also false or 'static'
        keyboard: true
      },
      $get: ['$injector', '$rootScope', '$q', '$http', '$templateCache', '$controller', '$modalStack',
        function ($injector, $rootScope, $q, $http, $templateCache, $controller, $modalStack) {

          var $modal = {};

          function getTemplatePromise(options) {
            return options.template ? $q.when(options.template) :
              $http.get(options.templateUrl, {cache: $templateCache}).then(function (result) {
                return result.data;
              });
          }

          function getResolvePromises(resolves) {
            var promisesArr = [];
            angular.forEach(resolves, function (value, key) {
              if (angular.isFunction(value) || angular.isArray(value)) {
                promisesArr.push($q.when($injector.invoke(value)));
              }
            });
            return promisesArr;
          }

          $modal.open = function (modalOptions) {

            var modalResultDeferred = $q.defer();
            var modalOpenedDeferred = $q.defer();

            //prepare an instance of a modal to be injected into controllers and returned to a caller
            var modalInstance = {
              result: modalResultDeferred.promise,
              opened: modalOpenedDeferred.promise,
              close: function (result) {
                $modalStack.close(modalInstance, result);
              },
              dismiss: function (reason) {
                $modalStack.dismiss(modalInstance, reason);
              }
            };

            //merge and clean up options
            modalOptions = angular.extend({}, $modalProvider.options, modalOptions);
            modalOptions.resolve = modalOptions.resolve || {};

            //verify options
            if (!modalOptions.template && !modalOptions.templateUrl) {
              throw new Error('One of template or templateUrl options is required.');
            }

            var templateAndResolvePromise =
              $q.all([getTemplatePromise(modalOptions)].concat(getResolvePromises(modalOptions.resolve)));


            templateAndResolvePromise.then(function resolveSuccess(tplAndVars) {

              var modalScope = (modalOptions.scope || $rootScope).$new();
              modalScope.$close = modalInstance.close;
              modalScope.$dismiss = modalInstance.dismiss;

              var ctrlInstance, ctrlLocals = {};
              var resolveIter = 1;

              //controllers
              if (modalOptions.controller) {
                ctrlLocals.$scope = modalScope;
                ctrlLocals.$modalInstance = modalInstance;
                angular.forEach(modalOptions.resolve, function (value, key) {
                  ctrlLocals[key] = tplAndVars[resolveIter++];
                });

                ctrlInstance = $controller(modalOptions.controller, ctrlLocals);
              }

              $modalStack.open(modalInstance, {
                scope: modalScope,
                deferred: modalResultDeferred,
                content: tplAndVars[0],
                backdrop: modalOptions.backdrop,
                keyboard: modalOptions.keyboard,
                windowClass: modalOptions.windowClass
              });

            }, function resolveError(reason) {
              modalResultDeferred.reject(reason);
            });

            templateAndResolvePromise.then(function () {
              modalOpenedDeferred.resolve(true);
            }, function () {
              modalOpenedDeferred.reject(false);
            });

            return modalInstance;
          };

          return $modal;
        }]
    };

    return $modalProvider;
  });

angular.module('ui.bootstrap.pagination', [])

.controller('PaginationController', ['$scope', '$attrs', '$parse', '$interpolate', function ($scope, $attrs, $parse, $interpolate) {
  var self = this,
      setNumPages = $attrs.numPages ? $parse($attrs.numPages).assign : angular.noop;

  this.init = function(defaultItemsPerPage) {
    if ($attrs.itemsPerPage) {
      $scope.$parent.$watch($parse($attrs.itemsPerPage), function(value) {
        self.itemsPerPage = parseInt(value, 10);
        $scope.totalPages = self.calculateTotalPages();
      });
    } else {
      this.itemsPerPage = defaultItemsPerPage;
    }
  };

  this.noPrevious = function() {
    return this.page === 1;
  };
  this.noNext = function() {
    return this.page === $scope.totalPages;
  };

  this.isActive = function(page) {
    return this.page === page;
  };

  this.calculateTotalPages = function() {
    var totalPages = this.itemsPerPage < 1 ? 1 : Math.ceil($scope.totalItems / this.itemsPerPage);
    return Math.max(totalPages || 0, 1);
  };

  this.getAttributeValue = function(attribute, defaultValue, interpolate) {
    return angular.isDefined(attribute) ? (interpolate ? $interpolate(attribute)($scope.$parent) : $scope.$parent.$eval(attribute)) : defaultValue;
  };

  this.render = function() {
    this.page = parseInt($scope.page, 10) || 1;
    if (this.page > 0 && this.page <= $scope.totalPages) {
      $scope.pages = this.getPages(this.page, $scope.totalPages);
    }
  };

  $scope.selectPage = function(page) {
    if ( ! self.isActive(page) && page > 0 && page <= $scope.totalPages) {
      $scope.page = page;
      $scope.onSelectPage({ page: page });
    }
  };

  $scope.$watch('page', function() {
    self.render();
  });

  $scope.$watch('totalItems', function() {
    $scope.totalPages = self.calculateTotalPages();
  });

  $scope.$watch('totalPages', function(value) {
    setNumPages($scope.$parent, value); // Readonly variable

    if ( self.page > value ) {
      $scope.selectPage(value);
    } else {
      self.render();
    }
  });
}])

.constant('paginationConfig', {
  itemsPerPage: 10,
  boundaryLinks: false,
  directionLinks: true,
  firstText: 'First',
  previousText: 'Previous',
  nextText: 'Next',
  lastText: 'Last',
  rotate: true
})

.directive('pagination', ['$parse', 'paginationConfig', function($parse, config) {
  return {
    restrict: 'EA',
    scope: {
      page: '=',
      totalItems: '=',
      onSelectPage:' &'
    },
    controller: 'PaginationController',
    templateUrl: 'template/pagination/pagination.html',
    replace: true,
    link: function(scope, element, attrs, paginationCtrl) {

      // Setup configuration parameters
      var maxSize,
      boundaryLinks  = paginationCtrl.getAttributeValue(attrs.boundaryLinks,  config.boundaryLinks      ),
      directionLinks = paginationCtrl.getAttributeValue(attrs.directionLinks, config.directionLinks     ),
      firstText      = paginationCtrl.getAttributeValue(attrs.firstText,      config.firstText,     true),
      previousText   = paginationCtrl.getAttributeValue(attrs.previousText,   config.previousText,  true),
      nextText       = paginationCtrl.getAttributeValue(attrs.nextText,       config.nextText,      true),
      lastText       = paginationCtrl.getAttributeValue(attrs.lastText,       config.lastText,      true),
      rotate         = paginationCtrl.getAttributeValue(attrs.rotate,         config.rotate);

      paginationCtrl.init(config.itemsPerPage);

      if (attrs.maxSize) {
        scope.$parent.$watch($parse(attrs.maxSize), function(value) {
          maxSize = parseInt(value, 10);
          paginationCtrl.render();
        });
      }

      // Create page object used in template
      function makePage(number, text, isActive, isDisabled) {
        return {
          number: number,
          text: text,
          active: isActive,
          disabled: isDisabled
        };
      }

      paginationCtrl.getPages = function(currentPage, totalPages) {
        var pages = [];

        // Default page limits
        var startPage = 1, endPage = totalPages;
        var isMaxSized = ( angular.isDefined(maxSize) && maxSize < totalPages );

        // recompute if maxSize
        if ( isMaxSized ) {
          if ( rotate ) {
            // Current page is displayed in the middle of the visible ones
            startPage = Math.max(currentPage - Math.floor(maxSize/2), 1);
            endPage   = startPage + maxSize - 1;

            // Adjust if limit is exceeded
            if (endPage > totalPages) {
              endPage   = totalPages;
              startPage = endPage - maxSize + 1;
            }
          } else {
            // Visible pages are paginated with maxSize
            startPage = ((Math.ceil(currentPage / maxSize) - 1) * maxSize) + 1;

            // Adjust last page if limit is exceeded
            endPage = Math.min(startPage + maxSize - 1, totalPages);
          }
        }

        // Add page number links
        for (var number = startPage; number <= endPage; number++) {
          var page = makePage(number, number, paginationCtrl.isActive(number), false);
          pages.push(page);
        }

        // Add links to move between page sets
        if ( isMaxSized && ! rotate ) {
          if ( startPage > 1 ) {
            var previousPageSet = makePage(startPage - 1, '...', false, false);
            pages.unshift(previousPageSet);
          }

          if ( endPage < totalPages ) {
            var nextPageSet = makePage(endPage + 1, '...', false, false);
            pages.push(nextPageSet);
          }
        }

        // Add previous & next links
        if (directionLinks) {
          var previousPage = makePage(currentPage - 1, previousText, false, paginationCtrl.noPrevious());
          pages.unshift(previousPage);

          var nextPage = makePage(currentPage + 1, nextText, false, paginationCtrl.noNext());
          pages.push(nextPage);
        }

        // Add first & last links
        if (boundaryLinks) {
          var firstPage = makePage(1, firstText, false, paginationCtrl.noPrevious());
          pages.unshift(firstPage);

          var lastPage = makePage(totalPages, lastText, false, paginationCtrl.noNext());
          pages.push(lastPage);
        }

        return pages;
      };
    }
  };
}])

.constant('pagerConfig', {
  itemsPerPage: 10,
  previousText: '« Previous',
  nextText: 'Next »',
  align: true
})

.directive('pager', ['pagerConfig', function(config) {
  return {
    restrict: 'EA',
    scope: {
      page: '=',
      totalItems: '=',
      onSelectPage:' &'
    },
    controller: 'PaginationController',
    templateUrl: 'template/pagination/pager.html',
    replace: true,
    link: function(scope, element, attrs, paginationCtrl) {

      // Setup configuration parameters
      var previousText = paginationCtrl.getAttributeValue(attrs.previousText, config.previousText, true),
      nextText         = paginationCtrl.getAttributeValue(attrs.nextText,     config.nextText,     true),
      align            = paginationCtrl.getAttributeValue(attrs.align,        config.align);

      paginationCtrl.init(config.itemsPerPage);

      // Create page object used in template
      function makePage(number, text, isDisabled, isPrevious, isNext) {
        return {
          number: number,
          text: text,
          disabled: isDisabled,
          previous: ( align && isPrevious ),
          next: ( align && isNext )
        };
      }

      paginationCtrl.getPages = function(currentPage) {
        return [
          makePage(currentPage - 1, previousText, paginationCtrl.noPrevious(), true, false),
          makePage(currentPage + 1, nextText, paginationCtrl.noNext(), false, true)
        ];
      };
    }
  };
}]);

/**
 * The following features are still outstanding: animation as a
 * function, placement as a function, inside, support for more triggers than
 * just mouse enter/leave, html tooltips, and selector delegation.
 */
angular.module( 'ui.bootstrap.tooltip', [ 'ui.bootstrap.position', 'ui.bootstrap.bindHtml' ] )

/**
 * The $tooltip service creates tooltip- and popover-like directives as well as
 * houses global options for them.
 */
.provider( '$tooltip', function () {
  // The default options tooltip and popover.
  var defaultOptions = {
    placement: 'top',
    animation: true,
    popupDelay: 0
  };

  // Default hide triggers for each show trigger
  var triggerMap = {
    'mouseenter': 'mouseleave',
    'click': 'click',
    'focus': 'blur'
  };

  // The options specified to the provider globally.
  var globalOptions = {};
  
  /**
   * `options({})` allows global configuration of all tooltips in the
   * application.
   *
   *   var app = angular.module( 'App', ['ui.bootstrap.tooltip'], function( $tooltipProvider ) {
   *     // place tooltips left instead of top by default
   *     $tooltipProvider.options( { placement: 'left' } );
   *   });
   */
	this.options = function( value ) {
		angular.extend( globalOptions, value );
	};

  /**
   * This allows you to extend the set of trigger mappings available. E.g.:
   *
   *   $tooltipProvider.setTriggers( 'openTrigger': 'closeTrigger' );
   */
  this.setTriggers = function setTriggers ( triggers ) {
    angular.extend( triggerMap, triggers );
  };

  /**
   * This is a helper function for translating camel-case to snake-case.
   */
  function snake_case(name){
    var regexp = /[A-Z]/g;
    var separator = '-';
    return name.replace(regexp, function(letter, pos) {
      return (pos ? separator : '') + letter.toLowerCase();
    });
  }

  /**
   * Returns the actual instance of the $tooltip service.
   * TODO support multiple triggers
   */
  this.$get = [ '$window', '$compile', '$timeout', '$parse', '$document', '$position', '$interpolate', function ( $window, $compile, $timeout, $parse, $document, $position, $interpolate ) {
    return function $tooltip ( type, prefix, defaultTriggerShow ) {
      var options = angular.extend( {}, defaultOptions, globalOptions );

      /**
       * Returns an object of show and hide triggers.
       *
       * If a trigger is supplied,
       * it is used to show the tooltip; otherwise, it will use the `trigger`
       * option passed to the `$tooltipProvider.options` method; else it will
       * default to the trigger supplied to this directive factory.
       *
       * The hide trigger is based on the show trigger. If the `trigger` option
       * was passed to the `$tooltipProvider.options` method, it will use the
       * mapped trigger from `triggerMap` or the passed trigger if the map is
       * undefined; otherwise, it uses the `triggerMap` value of the show
       * trigger; else it will just use the show trigger.
       */
      function getTriggers ( trigger ) {
        var show = trigger || options.trigger || defaultTriggerShow;
        var hide = triggerMap[show] || show;
        return {
          show: show,
          hide: hide
        };
      }

      var directiveName = snake_case( type );

      var startSym = $interpolate.startSymbol();
      var endSym = $interpolate.endSymbol();
      var template = 
        '<div '+ directiveName +'-popup '+
          'title="'+startSym+'tt_title'+endSym+'" '+
          'content="'+startSym+'tt_content'+endSym+'" '+
          'placement="'+startSym+'tt_placement'+endSym+'" '+
          'animation="tt_animation" '+
          'is-open="tt_isOpen"'+
          '>'+
        '</div>';

      return {
        restrict: 'EA',
        scope: true,
        compile: function (tElem, tAttrs) {
          var tooltipLinker = $compile( template );

          return function link ( scope, element, attrs ) {
            var tooltip;
            var transitionTimeout;
            var popupTimeout;
            var appendToBody = angular.isDefined( options.appendToBody ) ? options.appendToBody : false;
            var triggers = getTriggers( undefined );
            var hasRegisteredTriggers = false;
            var hasEnableExp = angular.isDefined(attrs[prefix+'Enable']);

            var positionTooltip = function (){
              var position,
                ttWidth,
                ttHeight,
                ttPosition;
              // Get the position of the directive element.
              position = appendToBody ? $position.offset( element ) : $position.position( element );

              // Get the height and width of the tooltip so we can center it.
              ttWidth = tooltip.prop( 'offsetWidth' );
              ttHeight = tooltip.prop( 'offsetHeight' );

              // Calculate the tooltip's top and left coordinates to center it with
              // this directive.
              switch ( scope.tt_placement ) {
                case 'right':
                  ttPosition = {
                    top: position.top + position.height / 2 - ttHeight / 2,
                    left: position.left + position.width
                  };
                  break;
                case 'bottom':
                  ttPosition = {
                    top: position.top + position.height,
                    left: position.left + position.width / 2 - ttWidth / 2
                  };
                  break;
                case 'left':
                  ttPosition = {
                    top: position.top + position.height / 2 - ttHeight / 2,
                    left: position.left - ttWidth
                  };
                  break;
                default:
                  ttPosition = {
                    top: position.top - ttHeight,
                    left: position.left + position.width / 2 - ttWidth / 2
                  };
                  break;
              }

              ttPosition.top += 'px';
              ttPosition.left += 'px';

              // Now set the calculated positioning.
              tooltip.css( ttPosition );

            };

            // By default, the tooltip is not open.
            // TODO add ability to start tooltip opened
            scope.tt_isOpen = false;

            function toggleTooltipBind () {
              if ( ! scope.tt_isOpen ) {
                showTooltipBind();
              } else {
                hideTooltipBind();
              }
            }

            // Show the tooltip with delay if specified, otherwise show it immediately
            function showTooltipBind() {
              if(hasEnableExp && !scope.$eval(attrs[prefix+'Enable'])) {
                return;
              }
              if ( scope.tt_popupDelay ) {
                popupTimeout = $timeout( show, scope.tt_popupDelay, false );
                popupTimeout.then(function(reposition){reposition();});
              } else {
                show()();
              }
            }

            function hideTooltipBind () {
              scope.$apply(function () {
                hide();
              });
            }

            // Show the tooltip popup element.
            function show() {


              // Don't show empty tooltips.
              if ( ! scope.tt_content ) {
                return angular.noop;
              }

              createTooltip();

              // If there is a pending remove transition, we must cancel it, lest the
              // tooltip be mysteriously removed.
              if ( transitionTimeout ) {
                $timeout.cancel( transitionTimeout );
              }

              // Set the initial positioning.
              tooltip.css({ top: 0, left: 0, display: 'block' });

              // Now we add it to the DOM because need some info about it. But it's not 
              // visible yet anyway.
              if ( appendToBody ) {
                  $document.find( 'body' ).append( tooltip );
              } else {
                element.after( tooltip );
              }

              positionTooltip();

              // And show the tooltip.
              scope.tt_isOpen = true;
              scope.$digest(); // digest required as $apply is not called

              // Return positioning function as promise callback for correct
              // positioning after draw.
              return positionTooltip;
            }

            // Hide the tooltip popup element.
            function hide() {
              // First things first: we don't show it anymore.
              scope.tt_isOpen = false;

              //if tooltip is going to be shown after delay, we must cancel this
              $timeout.cancel( popupTimeout );

              // And now we remove it from the DOM. However, if we have animation, we 
              // need to wait for it to expire beforehand.
              // FIXME: this is a placeholder for a port of the transitions library.
              if ( scope.tt_animation ) {
                transitionTimeout = $timeout(removeTooltip, 500);
              } else {
                removeTooltip();
              }
            }

            function createTooltip() {
              // There can only be one tooltip element per directive shown at once.
              if (tooltip) {
                removeTooltip();
              }
              tooltip = tooltipLinker(scope, function () {});

              // Get contents rendered into the tooltip
              scope.$digest();
            }

            function removeTooltip() {
              if (tooltip) {
                tooltip.remove();
                tooltip = null;
              }
            }

            /**
             * Observe the relevant attributes.
             */
            attrs.$observe( type, function ( val ) {
              scope.tt_content = val;

              if (!val && scope.tt_isOpen ) {
                hide();
              }
            });

            attrs.$observe( prefix+'Title', function ( val ) {
              scope.tt_title = val;
            });

            attrs.$observe( prefix+'Placement', function ( val ) {
              scope.tt_placement = angular.isDefined( val ) ? val : options.placement;
            });

            attrs.$observe( prefix+'PopupDelay', function ( val ) {
              var delay = parseInt( val, 10 );
              scope.tt_popupDelay = ! isNaN(delay) ? delay : options.popupDelay;
            });

            var unregisterTriggers = function() {
              if (hasRegisteredTriggers) {
                element.unbind( triggers.show, showTooltipBind );
                element.unbind( triggers.hide, hideTooltipBind );
              }
            };

            attrs.$observe( prefix+'Trigger', function ( val ) {
              unregisterTriggers();

              triggers = getTriggers( val );

              if ( triggers.show === triggers.hide ) {
                element.bind( triggers.show, toggleTooltipBind );
              } else {
                element.bind( triggers.show, showTooltipBind );
                element.bind( triggers.hide, hideTooltipBind );
              }

              hasRegisteredTriggers = true;
            });

            var animation = scope.$eval(attrs[prefix + 'Animation']);
            scope.tt_animation = angular.isDefined(animation) ? !!animation : options.animation;

            attrs.$observe( prefix+'AppendToBody', function ( val ) {
              appendToBody = angular.isDefined( val ) ? $parse( val )( scope ) : appendToBody;
            });

            // if a tooltip is attached to <body> we need to remove it on
            // location change as its parent scope will probably not be destroyed
            // by the change.
            if ( appendToBody ) {
              scope.$on('$locationChangeSuccess', function closeTooltipOnLocationChangeSuccess () {
              if ( scope.tt_isOpen ) {
                hide();
              }
            });
            }

            // Make sure tooltip is destroyed and removed.
            scope.$on('$destroy', function onDestroyTooltip() {
              $timeout.cancel( transitionTimeout );
              $timeout.cancel( popupTimeout );
              unregisterTriggers();
              removeTooltip();
            });
          };
        }
      };
    };
  }];
})

.directive( 'tooltipPopup', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: { content: '@', placement: '@', animation: '&', isOpen: '&' },
    templateUrl: 'template/tooltip/tooltip-popup.html'
  };
})

.directive( 'tooltip', [ '$tooltip', function ( $tooltip ) {
  return $tooltip( 'tooltip', 'tooltip', 'mouseenter' );
}])

.directive( 'tooltipHtmlUnsafePopup', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: { content: '@', placement: '@', animation: '&', isOpen: '&' },
    templateUrl: 'template/tooltip/tooltip-html-unsafe-popup.html'
  };
})

.directive( 'tooltipHtmlUnsafe', [ '$tooltip', function ( $tooltip ) {
  return $tooltip( 'tooltipHtmlUnsafe', 'tooltip', 'mouseenter' );
}]);

/**
 * The following features are still outstanding: popup delay, animation as a
 * function, placement as a function, inside, support for more triggers than
 * just mouse enter/leave, html popovers, and selector delegatation.
 */
angular.module( 'ui.bootstrap.popover', [ 'ui.bootstrap.tooltip' ] )

.directive( 'popoverPopup', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: { title: '@', content: '@', placement: '@', animation: '&', isOpen: '&' },
    templateUrl: 'template/popover/popover.html'
  };
})

.directive( 'popover', [ '$tooltip', function ( $tooltip ) {
  return $tooltip( 'popover', 'popover', 'click' );
}]);

angular.module('ui.bootstrap.progressbar', ['ui.bootstrap.transition'])

.constant('progressConfig', {
  animate: true,
  max: 100
})

.controller('ProgressController', ['$scope', '$attrs', 'progressConfig', '$transition', function($scope, $attrs, progressConfig, $transition) {
    var self = this,
        bars = [],
        max = angular.isDefined($attrs.max) ? $scope.$parent.$eval($attrs.max) : progressConfig.max,
        animate = angular.isDefined($attrs.animate) ? $scope.$parent.$eval($attrs.animate) : progressConfig.animate;

    this.addBar = function(bar, element) {
        var oldValue = 0, index = bar.$parent.$index;
        if ( angular.isDefined(index) &&  bars[index] ) {
            oldValue = bars[index].value;
        }
        bars.push(bar);

        this.update(element, bar.value, oldValue);

        bar.$watch('value', function(value, oldValue) {
            if (value !== oldValue) {
                self.update(element, value, oldValue);
            }
        });

        bar.$on('$destroy', function() {
            self.removeBar(bar);
        });
    };

    // Update bar element width
    this.update = function(element, newValue, oldValue) {
        var percent = this.getPercentage(newValue);

        if (animate) {
            element.css('width', this.getPercentage(oldValue) + '%');
            $transition(element, {width: percent + '%'});
        } else {
            element.css({'transition': 'none', 'width': percent + '%'});
        }
    };

    this.removeBar = function(bar) {
        bars.splice(bars.indexOf(bar), 1);
    };

    this.getPercentage = function(value) {
        return Math.round(100 * value / max);
    };
}])

.directive('progress', function() {
    return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        controller: 'ProgressController',
        require: 'progress',
        scope: {},
        template: '<div class="progress" ng-transclude></div>'
        //templateUrl: 'template/progressbar/progress.html' // Works in AngularJS 1.2
    };
})

.directive('bar', function() {
    return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        require: '^progress',
        scope: {
            value: '=',
            type: '@'
        },
        templateUrl: 'template/progressbar/bar.html',
        link: function(scope, element, attrs, progressCtrl) {
            progressCtrl.addBar(scope, element);
        }
    };
})

.directive('progressbar', function() {
    return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        controller: 'ProgressController',
        scope: {
            value: '=',
            type: '@'
        },
        templateUrl: 'template/progressbar/progressbar.html',
        link: function(scope, element, attrs, progressCtrl) {
            progressCtrl.addBar(scope, angular.element(element.children()[0]));
        }
    };
});
angular.module('ui.bootstrap.rating', [])

.constant('ratingConfig', {
  max: 5,
  stateOn: null,
  stateOff: null
})

.controller('RatingController', ['$scope', '$attrs', '$parse', 'ratingConfig', function($scope, $attrs, $parse, ratingConfig) {

  this.maxRange = angular.isDefined($attrs.max) ? $scope.$parent.$eval($attrs.max) : ratingConfig.max;
  this.stateOn = angular.isDefined($attrs.stateOn) ? $scope.$parent.$eval($attrs.stateOn) : ratingConfig.stateOn;
  this.stateOff = angular.isDefined($attrs.stateOff) ? $scope.$parent.$eval($attrs.stateOff) : ratingConfig.stateOff;

  this.createRateObjects = function(states) {
    var defaultOptions = {
      stateOn: this.stateOn,
      stateOff: this.stateOff
    };

    for (var i = 0, n = states.length; i < n; i++) {
      states[i] = angular.extend({ index: i }, defaultOptions, states[i]);
    }
    return states;
  };

  // Get objects used in template
  $scope.range = angular.isDefined($attrs.ratingStates) ?  this.createRateObjects(angular.copy($scope.$parent.$eval($attrs.ratingStates))): this.createRateObjects(new Array(this.maxRange));

  $scope.rate = function(value) {
    if ( $scope.value !== value && !$scope.readonly ) {
      $scope.value = value;
    }
  };

  $scope.enter = function(value) {
    if ( ! $scope.readonly ) {
      $scope.val = value;
    }
    $scope.onHover({value: value});
  };

  $scope.reset = function() {
    $scope.val = angular.copy($scope.value);
    $scope.onLeave();
  };

  $scope.$watch('value', function(value) {
    $scope.val = value;
  });

  $scope.readonly = false;
  if ($attrs.readonly) {
    $scope.$parent.$watch($parse($attrs.readonly), function(value) {
      $scope.readonly = !!value;
    });
  }
}])

.directive('rating', function() {
  return {
    restrict: 'EA',
    scope: {
      value: '=',
      onHover: '&',
      onLeave: '&'
    },
    controller: 'RatingController',
    templateUrl: 'template/rating/rating.html',
    replace: true
  };
});

/**
 * @ngdoc overview
 * @name ui.bootstrap.tabs
 *
 * @description
 * AngularJS version of the tabs directive.
 */

angular.module('ui.bootstrap.tabs', [])

.controller('TabsetController', ['$scope', function TabsetCtrl($scope) {
  var ctrl = this,
      tabs = ctrl.tabs = $scope.tabs = [];

  ctrl.select = function(tab) {
    angular.forEach(tabs, function(tab) {
      tab.active = false;
    });
    tab.active = true;
  };

  ctrl.addTab = function addTab(tab) {
    tabs.push(tab);
    if (tabs.length === 1 || tab.active) {
      ctrl.select(tab);
    }
  };

  ctrl.removeTab = function removeTab(tab) {
    var index = tabs.indexOf(tab);
    //Select a new tab if the tab to be removed is selected
    if (tab.active && tabs.length > 1) {
      //If this is the last tab, select the previous tab. else, the next tab.
      var newActiveIndex = index == tabs.length - 1 ? index - 1 : index + 1;
      ctrl.select(tabs[newActiveIndex]);
    }
    tabs.splice(index, 1);
  };
}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabset
 * @restrict EA
 *
 * @description
 * Tabset is the outer container for the tabs directive
 *
 * @param {boolean=} vertical Whether or not to use vertical styling for the tabs.
 * @param {boolean=} justified Whether or not to use justified styling for the tabs.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <tabset>
      <tab heading="Tab 1"><b>First</b> Content!</tab>
      <tab heading="Tab 2"><i>Second</i> Content!</tab>
    </tabset>
    <hr />
    <tabset vertical="true">
      <tab heading="Vertical Tab 1"><b>First</b> Vertical Content!</tab>
      <tab heading="Vertical Tab 2"><i>Second</i> Vertical Content!</tab>
    </tabset>
    <tabset justified="true">
      <tab heading="Justified Tab 1"><b>First</b> Justified Content!</tab>
      <tab heading="Justified Tab 2"><i>Second</i> Justified Content!</tab>
    </tabset>
  </file>
</example>
 */
.directive('tabset', function() {
  return {
    restrict: 'EA',
    transclude: true,
    replace: true,
    scope: {},
    controller: 'TabsetController',
    templateUrl: 'template/tabs/tabset.html',
    link: function(scope, element, attrs) {
      scope.vertical = angular.isDefined(attrs.vertical) ? scope.$parent.$eval(attrs.vertical) : false;
      scope.justified = angular.isDefined(attrs.justified) ? scope.$parent.$eval(attrs.justified) : false;
      scope.type = angular.isDefined(attrs.type) ? scope.$parent.$eval(attrs.type) : 'tabs';
    }
  };
})

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tab
 * @restrict EA
 *
 * @param {string=} heading The visible heading, or title, of the tab. Set HTML headings with {@link ui.bootstrap.tabs.directive:tabHeading tabHeading}.
 * @param {string=} select An expression to evaluate when the tab is selected.
 * @param {boolean=} active A binding, telling whether or not this tab is selected.
 * @param {boolean=} disabled A binding, telling whether or not this tab is disabled.
 *
 * @description
 * Creates a tab with a heading and content. Must be placed within a {@link ui.bootstrap.tabs.directive:tabset tabset}.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <div ng-controller="TabsDemoCtrl">
      <button class="btn btn-small" ng-click="items[0].active = true">
        Select item 1, using active binding
      </button>
      <button class="btn btn-small" ng-click="items[1].disabled = !items[1].disabled">
        Enable/disable item 2, using disabled binding
      </button>
      <br />
      <tabset>
        <tab heading="Tab 1">First Tab</tab>
        <tab select="alertMe()">
          <tab-heading><i class="icon-bell"></i> Alert me!</tab-heading>
          Second Tab, with alert callback and html heading!
        </tab>
        <tab ng-repeat="item in items"
          heading="{{item.title}}"
          disabled="item.disabled"
          active="item.active">
          {{item.content}}
        </tab>
      </tabset>
    </div>
  </file>
  <file name="script.js">
    function TabsDemoCtrl($scope) {
      $scope.items = [
        { title:"Dynamic Title 1", content:"Dynamic Item 0" },
        { title:"Dynamic Title 2", content:"Dynamic Item 1", disabled: true }
      ];

      $scope.alertMe = function() {
        setTimeout(function() {
          alert("You've selected the alert tab!");
        });
      };
    };
  </file>
</example>
 */

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabHeading
 * @restrict EA
 *
 * @description
 * Creates an HTML heading for a {@link ui.bootstrap.tabs.directive:tab tab}. Must be placed as a child of a tab element.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <tabset>
      <tab>
        <tab-heading><b>HTML</b> in my titles?!</tab-heading>
        And some content, too!
      </tab>
      <tab>
        <tab-heading><i class="icon-heart"></i> Icon heading?!?</tab-heading>
        That's right.
      </tab>
    </tabset>
  </file>
</example>
 */
.directive('tab', ['$parse', function($parse) {
  return {
    require: '^tabset',
    restrict: 'EA',
    replace: true,
    templateUrl: 'template/tabs/tab.html',
    transclude: true,
    scope: {
      heading: '@',
      onSelect: '&select', //This callback is called in contentHeadingTransclude
                          //once it inserts the tab's content into the dom
      onDeselect: '&deselect'
    },
    controller: function() {
      //Empty controller so other directives can require being 'under' a tab
    },
    compile: function(elm, attrs, transclude) {
      return function postLink(scope, elm, attrs, tabsetCtrl) {
        var getActive, setActive;
        if (attrs.active) {
          getActive = $parse(attrs.active);
          setActive = getActive.assign;
          scope.$parent.$watch(getActive, function updateActive(value, oldVal) {
            // Avoid re-initializing scope.active as it is already initialized
            // below. (watcher is called async during init with value ===
            // oldVal)
            if (value !== oldVal) {
              scope.active = !!value;
            }
          });
          scope.active = getActive(scope.$parent);
        } else {
          setActive = getActive = angular.noop;
        }

        scope.$watch('active', function(active) {
          // Note this watcher also initializes and assigns scope.active to the
          // attrs.active expression.
          setActive(scope.$parent, active);
          if (active) {
            tabsetCtrl.select(scope);
            scope.onSelect();
          } else {
            scope.onDeselect();
          }
        });

        scope.disabled = false;
        if ( attrs.disabled ) {
          scope.$parent.$watch($parse(attrs.disabled), function(value) {
            scope.disabled = !! value;
          });
        }

        scope.select = function() {
          if ( ! scope.disabled ) {
            scope.active = true;
          }
        };

        tabsetCtrl.addTab(scope);
        scope.$on('$destroy', function() {
          tabsetCtrl.removeTab(scope);
        });


        //We need to transclude later, once the content container is ready.
        //when this link happens, we're inside a tab heading.
        scope.$transcludeFn = transclude;
      };
    }
  };
}])

.directive('tabHeadingTransclude', [function() {
  return {
    restrict: 'A',
    require: '^tab',
    link: function(scope, elm, attrs, tabCtrl) {
      scope.$watch('headingElement', function updateHeadingElement(heading) {
        if (heading) {
          elm.html('');
          elm.append(heading);
        }
      });
    }
  };
}])

.directive('tabContentTransclude', function() {
  return {
    restrict: 'A',
    require: '^tabset',
    link: function(scope, elm, attrs) {
      var tab = scope.$eval(attrs.tabContentTransclude);

      //Now our tab is ready to be transcluded: both the tab heading area
      //and the tab content area are loaded.  Transclude 'em both.
      tab.$transcludeFn(tab.$parent, function(contents) {
        angular.forEach(contents, function(node) {
          if (isTabHeading(node)) {
            //Let tabHeadingTransclude know.
            tab.headingElement = node;
          } else {
            elm.append(node);
          }
        });
      });
    }
  };
  function isTabHeading(node) {
    return node.tagName &&  (
      node.hasAttribute('tab-heading') ||
      node.hasAttribute('data-tab-heading') ||
      node.tagName.toLowerCase() === 'tab-heading' ||
      node.tagName.toLowerCase() === 'data-tab-heading'
    );
  }
})

;

angular.module('ui.bootstrap.timepicker', [])

.constant('timepickerConfig', {
  hourStep: 1,
  minuteStep: 1,
  showMeridian: true,
  meridians: null,
  readonlyInput: false,
  mousewheel: true
})

.directive('timepicker', ['$parse', '$log', 'timepickerConfig', '$locale', function ($parse, $log, timepickerConfig, $locale) {
  return {
    restrict: 'EA',
    require:'?^ngModel',
    replace: true,
    scope: {},
    templateUrl: 'template/timepicker/timepicker.html',
    link: function(scope, element, attrs, ngModel) {
      if ( !ngModel ) {
        return; // do nothing if no ng-model
      }

      var selected = new Date(),
          meridians = angular.isDefined(attrs.meridians) ? scope.$parent.$eval(attrs.meridians) : timepickerConfig.meridians || $locale.DATETIME_FORMATS.AMPMS;

      var hourStep = timepickerConfig.hourStep;
      if (attrs.hourStep) {
        scope.$parent.$watch($parse(attrs.hourStep), function(value) {
          hourStep = parseInt(value, 10);
        });
      }

      var minuteStep = timepickerConfig.minuteStep;
      if (attrs.minuteStep) {
        scope.$parent.$watch($parse(attrs.minuteStep), function(value) {
          minuteStep = parseInt(value, 10);
        });
      }

      // 12H / 24H mode
      scope.showMeridian = timepickerConfig.showMeridian;
      if (attrs.showMeridian) {
        scope.$parent.$watch($parse(attrs.showMeridian), function(value) {
          scope.showMeridian = !!value;

          if ( ngModel.$error.time ) {
            // Evaluate from template
            var hours = getHoursFromTemplate(), minutes = getMinutesFromTemplate();
            if (angular.isDefined( hours ) && angular.isDefined( minutes )) {
              selected.setHours( hours );
              refresh();
            }
          } else {
            updateTemplate();
          }
        });
      }

      // Get scope.hours in 24H mode if valid
      function getHoursFromTemplate ( ) {
        var hours = parseInt( scope.hours, 10 );
        var valid = ( scope.showMeridian ) ? (hours > 0 && hours < 13) : (hours >= 0 && hours < 24);
        if ( !valid ) {
          return undefined;
        }

        if ( scope.showMeridian ) {
          if ( hours === 12 ) {
            hours = 0;
          }
          if ( scope.meridian === meridians[1] ) {
            hours = hours + 12;
          }
        }
        return hours;
      }

      function getMinutesFromTemplate() {
        var minutes = parseInt(scope.minutes, 10);
        return ( minutes >= 0 && minutes < 60 ) ? minutes : undefined;
      }

      function pad( value ) {
        return ( angular.isDefined(value) && value.toString().length < 2 ) ? '0' + value : value;
      }

      // Input elements
      var inputs = element.find('input'), hoursInputEl = inputs.eq(0), minutesInputEl = inputs.eq(1);

      // Respond on mousewheel spin
      var mousewheel = (angular.isDefined(attrs.mousewheel)) ? scope.$eval(attrs.mousewheel) : timepickerConfig.mousewheel;
      if ( mousewheel ) {

        var isScrollingUp = function(e) {
          if (e.originalEvent) {
            e = e.originalEvent;
          }
          //pick correct delta variable depending on event
          var delta = (e.wheelDelta) ? e.wheelDelta : -e.deltaY;
          return (e.detail || delta > 0);
        };

        hoursInputEl.bind('mousewheel wheel', function(e) {
          scope.$apply( (isScrollingUp(e)) ? scope.incrementHours() : scope.decrementHours() );
          e.preventDefault();
        });

        minutesInputEl.bind('mousewheel wheel', function(e) {
          scope.$apply( (isScrollingUp(e)) ? scope.incrementMinutes() : scope.decrementMinutes() );
          e.preventDefault();
        });
      }

      scope.readonlyInput = (angular.isDefined(attrs.readonlyInput)) ? scope.$eval(attrs.readonlyInput) : timepickerConfig.readonlyInput;
      if ( ! scope.readonlyInput ) {

        var invalidate = function(invalidHours, invalidMinutes) {
          ngModel.$setViewValue( null );
          ngModel.$setValidity('time', false);
          if (angular.isDefined(invalidHours)) {
            scope.invalidHours = invalidHours;
          }
          if (angular.isDefined(invalidMinutes)) {
            scope.invalidMinutes = invalidMinutes;
          }
        };

        scope.updateHours = function() {
          var hours = getHoursFromTemplate();

          if ( angular.isDefined(hours) ) {
            selected.setHours( hours );
            refresh( 'h' );
          } else {
            invalidate(true);
          }
        };

        hoursInputEl.bind('blur', function(e) {
          if ( !scope.validHours && scope.hours < 10) {
            scope.$apply( function() {
              scope.hours = pad( scope.hours );
            });
          }
        });

        scope.updateMinutes = function() {
          var minutes = getMinutesFromTemplate();

          if ( angular.isDefined(minutes) ) {
            selected.setMinutes( minutes );
            refresh( 'm' );
          } else {
            invalidate(undefined, true);
          }
        };

        minutesInputEl.bind('blur', function(e) {
          if ( !scope.invalidMinutes && scope.minutes < 10 ) {
            scope.$apply( function() {
              scope.minutes = pad( scope.minutes );
            });
          }
        });
      } else {
        scope.updateHours = angular.noop;
        scope.updateMinutes = angular.noop;
      }

      ngModel.$render = function() {
        var date = ngModel.$modelValue ? new Date( ngModel.$modelValue ) : null;

        if ( isNaN(date) ) {
          ngModel.$setValidity('time', false);
          $log.error('Timepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
        } else {
          if ( date ) {
            selected = date;
          }
          makeValid();
          updateTemplate();
        }
      };

      // Call internally when we know that model is valid.
      function refresh( keyboardChange ) {
        makeValid();
        ngModel.$setViewValue( new Date(selected) );
        updateTemplate( keyboardChange );
      }

      function makeValid() {
        ngModel.$setValidity('time', true);
        scope.invalidHours = false;
        scope.invalidMinutes = false;
      }

      function updateTemplate( keyboardChange ) {
        var hours = selected.getHours(), minutes = selected.getMinutes();

        if ( scope.showMeridian ) {
          hours = ( hours === 0 || hours === 12 ) ? 12 : hours % 12; // Convert 24 to 12 hour system
        }
        scope.hours =  keyboardChange === 'h' ? hours : pad(hours);
        scope.minutes = keyboardChange === 'm' ? minutes : pad(minutes);
        scope.meridian = selected.getHours() < 12 ? meridians[0] : meridians[1];
      }

      function addMinutes( minutes ) {
        var dt = new Date( selected.getTime() + minutes * 60000 );
        selected.setHours( dt.getHours(), dt.getMinutes() );
        refresh();
      }

      scope.incrementHours = function() {
        addMinutes( hourStep * 60 );
      };
      scope.decrementHours = function() {
        addMinutes( - hourStep * 60 );
      };
      scope.incrementMinutes = function() {
        addMinutes( minuteStep );
      };
      scope.decrementMinutes = function() {
        addMinutes( - minuteStep );
      };
      scope.toggleMeridian = function() {
        addMinutes( 12 * 60 * (( selected.getHours() < 12 ) ? 1 : -1) );
      };
    }
  };
}]);

angular.module('ui.bootstrap.typeahead', ['ui.bootstrap.position', 'ui.bootstrap.bindHtml'])

/**
 * A helper service that can parse typeahead's syntax (string provided by users)
 * Extracted to a separate service for ease of unit testing
 */
  .factory('typeaheadParser', ['$parse', function ($parse) {

  //                      00000111000000000000022200000000000000003333333333333330000000000044000
  var TYPEAHEAD_REGEXP = /^\s*(.*?)(?:\s+as\s+(.*?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+(.*)$/;

  return {
    parse:function (input) {

      var match = input.match(TYPEAHEAD_REGEXP), modelMapper, viewMapper, source;
      if (!match) {
        throw new Error(
          "Expected typeahead specification in form of '_modelValue_ (as _label_)? for _item_ in _collection_'" +
            " but got '" + input + "'.");
      }

      return {
        itemName:match[3],
        source:$parse(match[4]),
        viewMapper:$parse(match[2] || match[1]),
        modelMapper:$parse(match[1])
      };
    }
  };
}])

  .directive('typeahead', ['$compile', '$parse', '$q', '$timeout', '$document', '$position', 'typeaheadParser',
    function ($compile, $parse, $q, $timeout, $document, $position, typeaheadParser) {

  var HOT_KEYS = [9, 13, 27, 38, 40];

  return {
    require:'ngModel',
    link:function (originalScope, element, attrs, modelCtrl) {

      //SUPPORTED ATTRIBUTES (OPTIONS)

      //minimal no of characters that needs to be entered before typeahead kicks-in
      var minSearch = originalScope.$eval(attrs.typeaheadMinLength) || 1;

      //minimal wait time after last character typed before typehead kicks-in
      var waitTime = originalScope.$eval(attrs.typeaheadWaitMs) || 0;

      //should it restrict model values to the ones selected from the popup only?
      var isEditable = originalScope.$eval(attrs.typeaheadEditable) !== false;

      //binding to a variable that indicates if matches are being retrieved asynchronously
      var isLoadingSetter = $parse(attrs.typeaheadLoading).assign || angular.noop;

      //a callback executed when a match is selected
      var onSelectCallback = $parse(attrs.typeaheadOnSelect);

      var inputFormatter = attrs.typeaheadInputFormatter ? $parse(attrs.typeaheadInputFormatter) : undefined;

      var appendToBody =  attrs.typeaheadAppendToBody ? $parse(attrs.typeaheadAppendToBody) : false;

      //INTERNAL VARIABLES

      //model setter executed upon match selection
      var $setModelValue = $parse(attrs.ngModel).assign;

      //expressions used by typeahead
      var parserResult = typeaheadParser.parse(attrs.typeahead);

      var hasFocus;

      //pop-up element used to display matches
      var popUpEl = angular.element('<div typeahead-popup></div>');
      popUpEl.attr({
        matches: 'matches',
        active: 'activeIdx',
        select: 'select(activeIdx)',
        query: 'query',
        position: 'position'
      });
      //custom item template
      if (angular.isDefined(attrs.typeaheadTemplateUrl)) {
        popUpEl.attr('template-url', attrs.typeaheadTemplateUrl);
      }

      //create a child scope for the typeahead directive so we are not polluting original scope
      //with typeahead-specific data (matches, query etc.)
      var scope = originalScope.$new();
      originalScope.$on('$destroy', function(){
        scope.$destroy();
      });

      var resetMatches = function() {
        scope.matches = [];
        scope.activeIdx = -1;
      };

      var getMatchesAsync = function(inputValue) {

        var locals = {$viewValue: inputValue};
        isLoadingSetter(originalScope, true);
        $q.when(parserResult.source(originalScope, locals)).then(function(matches) {

          //it might happen that several async queries were in progress if a user were typing fast
          //but we are interested only in responses that correspond to the current view value
          if (inputValue === modelCtrl.$viewValue && hasFocus) {
            if (matches.length > 0) {

              scope.activeIdx = 0;
              scope.matches.length = 0;

              //transform labels
              for(var i=0; i<matches.length; i++) {
                locals[parserResult.itemName] = matches[i];
                scope.matches.push({
                  label: parserResult.viewMapper(scope, locals),
                  model: matches[i]
                });
              }

              scope.query = inputValue;
              //position pop-up with matches - we need to re-calculate its position each time we are opening a window
              //with matches as a pop-up might be absolute-positioned and position of an input might have changed on a page
              //due to other elements being rendered
              scope.position = appendToBody ? $position.offset(element) : $position.position(element);
              scope.position.top = scope.position.top + element.prop('offsetHeight');

            } else {
              resetMatches();
            }
            isLoadingSetter(originalScope, false);
          }
        }, function(){
          resetMatches();
          isLoadingSetter(originalScope, false);
        });
      };

      resetMatches();

      //we need to propagate user's query so we can higlight matches
      scope.query = undefined;

      //Declare the timeout promise var outside the function scope so that stacked calls can be cancelled later 
      var timeoutPromise;

      //plug into $parsers pipeline to open a typeahead on view changes initiated from DOM
      //$parsers kick-in on all the changes coming from the view as well as manually triggered by $setViewValue
      modelCtrl.$parsers.unshift(function (inputValue) {

        hasFocus = true;

        if (inputValue && inputValue.length >= minSearch) {
          if (waitTime > 0) {
            if (timeoutPromise) {
              $timeout.cancel(timeoutPromise);//cancel previous timeout
            }
            timeoutPromise = $timeout(function () {
              getMatchesAsync(inputValue);
            }, waitTime);
          } else {
            getMatchesAsync(inputValue);
          }
        } else {
          isLoadingSetter(originalScope, false);
          resetMatches();
        }

        if (isEditable) {
          return inputValue;
        } else {
          if (!inputValue) {
            // Reset in case user had typed something previously.
            modelCtrl.$setValidity('editable', true);
            return inputValue;
          } else {
            modelCtrl.$setValidity('editable', false);
            return undefined;
          }
        }
      });

      modelCtrl.$formatters.push(function (modelValue) {

        var candidateViewValue, emptyViewValue;
        var locals = {};

        if (inputFormatter) {

          locals['$model'] = modelValue;
          return inputFormatter(originalScope, locals);

        } else {

          //it might happen that we don't have enough info to properly render input value
          //we need to check for this situation and simply return model value if we can't apply custom formatting
          locals[parserResult.itemName] = modelValue;
          candidateViewValue = parserResult.viewMapper(originalScope, locals);
          locals[parserResult.itemName] = undefined;
          emptyViewValue = parserResult.viewMapper(originalScope, locals);

          return candidateViewValue!== emptyViewValue ? candidateViewValue : modelValue;
        }
      });

      scope.select = function (activeIdx) {
        //called from within the $digest() cycle
        var locals = {};
        var model, item;

        locals[parserResult.itemName] = item = scope.matches[activeIdx].model;
        model = parserResult.modelMapper(originalScope, locals);
        $setModelValue(originalScope, model);
        modelCtrl.$setValidity('editable', true);

        onSelectCallback(originalScope, {
          $item: item,
          $model: model,
          $label: parserResult.viewMapper(originalScope, locals)
        });

        resetMatches();

        //return focus to the input element if a mach was selected via a mouse click event
        element[0].focus();
      };

      //bind keyboard events: arrows up(38) / down(40), enter(13) and tab(9), esc(27)
      element.bind('keydown', function (evt) {

        //typeahead is open and an "interesting" key was pressed
        if (scope.matches.length === 0 || HOT_KEYS.indexOf(evt.which) === -1) {
          return;
        }

        evt.preventDefault();

        if (evt.which === 40) {
          scope.activeIdx = (scope.activeIdx + 1) % scope.matches.length;
          scope.$digest();

        } else if (evt.which === 38) {
          scope.activeIdx = (scope.activeIdx ? scope.activeIdx : scope.matches.length) - 1;
          scope.$digest();

        } else if (evt.which === 13 || evt.which === 9) {
          scope.$apply(function () {
            scope.select(scope.activeIdx);
          });

        } else if (evt.which === 27) {
          evt.stopPropagation();

          resetMatches();
          scope.$digest();
        }
      });

      element.bind('blur', function (evt) {
        hasFocus = false;
      });

      // Keep reference to click handler to unbind it.
      var dismissClickHandler = function (evt) {
        if (element[0] !== evt.target) {
          resetMatches();
          scope.$digest();
        }
      };

      $document.bind('click', dismissClickHandler);

      originalScope.$on('$destroy', function(){
        $document.unbind('click', dismissClickHandler);
      });

      var $popup = $compile(popUpEl)(scope);
      if ( appendToBody ) {
        $document.find('body').append($popup);
      } else {
        element.after($popup);
      }
    }
  };

}])

  .directive('typeaheadPopup', function () {
    return {
      restrict:'EA',
      scope:{
        matches:'=',
        query:'=',
        active:'=',
        position:'=',
        select:'&'
      },
      replace:true,
      templateUrl:'template/typeahead/typeahead-popup.html',
      link:function (scope, element, attrs) {

        scope.templateUrl = attrs.templateUrl;

        scope.isOpen = function () {
          return scope.matches.length > 0;
        };

        scope.isActive = function (matchIdx) {
          return scope.active == matchIdx;
        };

        scope.selectActive = function (matchIdx) {
          scope.active = matchIdx;
        };

        scope.selectMatch = function (activeIdx) {
          scope.select({activeIdx:activeIdx});
        };
      }
    };
  })

  .directive('typeaheadMatch', ['$http', '$templateCache', '$compile', '$parse', function ($http, $templateCache, $compile, $parse) {
    return {
      restrict:'EA',
      scope:{
        index:'=',
        match:'=',
        query:'='
      },
      link:function (scope, element, attrs) {
        var tplUrl = $parse(attrs.templateUrl)(scope.$parent) || 'template/typeahead/typeahead-match.html';
        $http.get(tplUrl, {cache: $templateCache}).success(function(tplContent){
           element.replaceWith($compile(tplContent.trim())(scope));
        });
      }
    };
  }])

  .filter('typeaheadHighlight', function() {

    function escapeRegexp(queryToEscape) {
      return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
    }

    return function(matchItem, query) {
      return query ? matchItem.replace(new RegExp(escapeRegexp(query), 'gi'), '<strong>$&</strong>') : matchItem;
    };
  });
angular.module("template/accordion/accordion-group.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/accordion/accordion-group.html",
    "<div class=\"panel panel-default\">\n" +
    "  <div class=\"panel-heading\">\n" +
    "    <h4 class=\"panel-title\">\n" +
    "      <a class=\"accordion-toggle\" ng-click=\"isOpen = !isOpen\" accordion-transclude=\"heading\">{{heading}}</a>\n" +
    "    </h4>\n" +
    "  </div>\n" +
    "  <div class=\"panel-collapse\" collapse=\"!isOpen\">\n" +
    "	  <div class=\"panel-body\" ng-transclude></div>\n" +
    "  </div>\n" +
    "</div>");
}]);

angular.module("template/accordion/accordion.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/accordion/accordion.html",
    "<div class=\"panel-group\" ng-transclude></div>");
}]);

angular.module("template/alert/alert.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/alert/alert.html",
    "<div class='alert' ng-class='\"alert-\" + (type || \"warning\")'>\n" +
    "    <button ng-show='closeable' type='button' class='close' ng-click='close()'>&times;</button>\n" +
    "    <div ng-transclude></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/carousel/carousel.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/carousel/carousel.html",
    "<div ng-mouseenter=\"pause()\" ng-mouseleave=\"play()\" class=\"carousel\">\n" +
    "    <ol class=\"carousel-indicators\" ng-show=\"slides().length > 1\">\n" +
    "        <li ng-repeat=\"slide in slides()\" ng-class=\"{active: isActive(slide)}\" ng-click=\"select(slide)\"></li>\n" +
    "    </ol>\n" +
    "    <div class=\"carousel-inner\" ng-transclude></div>\n" +
    "    <a class=\"left carousel-control\" ng-click=\"prev()\" ng-show=\"slides().length > 1\"><span class=\"icon-prev\"></span></a>\n" +
    "    <a class=\"right carousel-control\" ng-click=\"next()\" ng-show=\"slides().length > 1\"><span class=\"icon-next\"></span></a>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/carousel/slide.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/carousel/slide.html",
    "<div ng-class=\"{\n" +
    "    'active': leaving || (active && !entering),\n" +
    "    'prev': (next || active) && direction=='prev',\n" +
    "    'next': (next || active) && direction=='next',\n" +
    "    'right': direction=='prev',\n" +
    "    'left': direction=='next'\n" +
    "  }\" class=\"item text-center\" ng-transclude></div>\n" +
    "");
}]);

angular.module("template/datepicker/datepicker.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/datepicker/datepicker.html",
    "<table>\n" +
    "  <thead>\n" +
    "    <tr>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left\" ng-click=\"move(-1)\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
    "      <th colspan=\"{{rows[0].length - 2 + showWeekNumbers}}\"><button type=\"button\" class=\"btn btn-default btn-sm btn-block\" ng-click=\"toggleMode()\"><strong>{{title}}</strong></button></th>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right\" ng-click=\"move(1)\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
    "    </tr>\n" +
    "    <tr ng-show=\"labels.length > 0\" class=\"h6\">\n" +
    "      <th ng-show=\"showWeekNumbers\" class=\"text-center\">#</th>\n" +
    "      <th ng-repeat=\"label in labels\" class=\"text-center\">{{label}}</th>\n" +
    "    </tr>\n" +
    "  </thead>\n" +
    "  <tbody>\n" +
    "    <tr ng-repeat=\"row in rows\">\n" +
    "      <td ng-show=\"showWeekNumbers\" class=\"text-center\"><em>{{ getWeekNumber(row) }}</em></td>\n" +
    "      <td ng-repeat=\"dt in row\" class=\"text-center\">\n" +
    "        <button type=\"button\" style=\"width:100%;\" class=\"btn btn-default btn-sm\" ng-class=\"{'btn-info': dt.selected}\" ng-click=\"select(dt.date)\" ng-disabled=\"dt.disabled\"><span ng-class=\"{'text-muted': dt.secondary}\">{{dt.label}}</span></button>\n" +
    "      </td>\n" +
    "    </tr>\n" +
    "  </tbody>\n" +
    "</table>\n" +
    "");
}]);

angular.module("template/datepicker/popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/datepicker/popup.html",
    "<ul class=\"dropdown-menu\" ng-style=\"{display: (isOpen && 'block') || 'none', top: position.top+'px', left: position.left+'px'}\">\n" +
    "	<li ng-transclude></li>\n" +
    "	<li ng-show=\"showButtonBar\" style=\"padding:10px 9px 2px\">\n" +
    "		<span class=\"btn-group\">\n" +
    "			<button type=\"button\" class=\"btn btn-sm btn-info\" ng-click=\"today()\">{{currentText}}</button>\n" +
    "			<button type=\"button\" class=\"btn btn-sm btn-default\" ng-click=\"showWeeks = ! showWeeks\" ng-class=\"{active: showWeeks}\">{{toggleWeeksText}}</button>\n" +
    "			<button type=\"button\" class=\"btn btn-sm btn-danger\" ng-click=\"clear()\">{{clearText}}</button>\n" +
    "		</span>\n" +
    "		<button type=\"button\" class=\"btn btn-sm btn-success pull-right\" ng-click=\"isOpen = false\">{{closeText}}</button>\n" +
    "	</li>\n" +
    "</ul>\n" +
    "");
}]);

angular.module("template/modal/backdrop.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/modal/backdrop.html",
    "<div class=\"modal-backdrop fade\" ng-class=\"{in: animate}\" ng-style=\"{'z-index': 1040 + index*10}\"></div>");
}]);

angular.module("template/modal/window.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/modal/window.html",
    "<div tabindex=\"-1\" class=\"modal fade {{ windowClass }}\" ng-class=\"{in: animate}\" ng-style=\"{'z-index': 1050 + index*10, display: 'block'}\" ng-click=\"close($event)\">\n" +
    "    <div class=\"modal-dialog\"><div class=\"modal-content\" ng-transclude></div></div>\n" +
    "</div>");
}]);

angular.module("template/pagination/pager.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/pagination/pager.html",
    "<ul class=\"pager\">\n" +
    "  <li ng-repeat=\"page in pages\" ng-class=\"{disabled: page.disabled, previous: page.previous, next: page.next}\"><a ng-click=\"selectPage(page.number)\">{{page.text}}</a></li>\n" +
    "</ul>");
}]);

angular.module("template/pagination/pagination.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/pagination/pagination.html",
    "<ul class=\"pagination\">\n" +
    "  <li ng-repeat=\"page in pages\" ng-class=\"{active: page.active, disabled: page.disabled}\"><a ng-click=\"selectPage(page.number)\">{{page.text}}</a></li>\n" +
    "</ul>");
}]);

angular.module("template/tooltip/tooltip-html-unsafe-popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/tooltip/tooltip-html-unsafe-popup.html",
    "<div class=\"tooltip {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
    "  <div class=\"tooltip-arrow\"></div>\n" +
    "  <div class=\"tooltip-inner\" bind-html-unsafe=\"content\"></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/tooltip/tooltip-popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/tooltip/tooltip-popup.html",
    "<div class=\"tooltip {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
    "  <div class=\"tooltip-arrow\"></div>\n" +
    "  <div class=\"tooltip-inner\" ng-bind=\"content\"></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/popover/popover.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/popover/popover.html",
    "<div class=\"popover {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
    "  <div class=\"arrow\"></div>\n" +
    "\n" +
    "  <div class=\"popover-inner\">\n" +
    "      <h3 class=\"popover-title\" ng-bind=\"title\" ng-show=\"title\"></h3>\n" +
    "      <div class=\"popover-content\" ng-bind=\"content\"></div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/progressbar/bar.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/progressbar/bar.html",
    "<div class=\"progress-bar\" ng-class=\"type && 'progress-bar-' + type\" ng-transclude></div>");
}]);

angular.module("template/progressbar/progress.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/progressbar/progress.html",
    "<div class=\"progress\" ng-transclude></div>");
}]);

angular.module("template/progressbar/progressbar.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/progressbar/progressbar.html",
    "<div class=\"progress\"><div class=\"progress-bar\" ng-class=\"type && 'progress-bar-' + type\" ng-transclude></div></div>");
}]);

angular.module("template/rating/rating.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/rating/rating.html",
    "<span ng-mouseleave=\"reset()\">\n" +
    "    <i ng-repeat=\"r in range\" ng-mouseenter=\"enter($index + 1)\" ng-click=\"rate($index + 1)\" class=\"glyphicon\" ng-class=\"$index < val && (r.stateOn || 'glyphicon-star') || (r.stateOff || 'glyphicon-star-empty')\"></i>\n" +
    "</span>");
}]);

angular.module("template/tabs/tab.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/tabs/tab.html",
    "<li ng-class=\"{active: active, disabled: disabled}\">\n" +
    "  <a ng-click=\"select()\" tab-heading-transclude>{{heading}}</a>\n" +
    "</li>\n" +
    "");
}]);

angular.module("template/tabs/tabset-titles.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/tabs/tabset-titles.html",
    "<ul class=\"nav {{type && 'nav-' + type}}\" ng-class=\"{'nav-stacked': vertical}\">\n" +
    "</ul>\n" +
    "");
}]);

angular.module("template/tabs/tabset.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/tabs/tabset.html",
    "\n" +
    "<div class=\"tabbable\">\n" +
    "  <ul class=\"nav {{type && 'nav-' + type}}\" ng-class=\"{'nav-stacked': vertical, 'nav-justified': justified}\" ng-transclude></ul>\n" +
    "  <div class=\"tab-content\">\n" +
    "    <div class=\"tab-pane\" \n" +
    "         ng-repeat=\"tab in tabs\" \n" +
    "         ng-class=\"{active: tab.active}\"\n" +
    "         tab-content-transclude=\"tab\">\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/timepicker/timepicker.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/timepicker/timepicker.html",
    "<table>\n" +
    "	<tbody>\n" +
    "		<tr class=\"text-center\">\n" +
    "			<td><a ng-click=\"incrementHours()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-up\"></span></a></td>\n" +
    "			<td>&nbsp;</td>\n" +
    "			<td><a ng-click=\"incrementMinutes()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-up\"></span></a></td>\n" +
    "			<td ng-show=\"showMeridian\"></td>\n" +
    "		</tr>\n" +
    "		<tr>\n" +
    "			<td style=\"width:50px;\" class=\"form-group\" ng-class=\"{'has-error': invalidHours}\">\n" +
    "				<input type=\"text\" ng-model=\"hours\" ng-change=\"updateHours()\" class=\"form-control text-center\" ng-mousewheel=\"incrementHours()\" ng-readonly=\"readonlyInput\" maxlength=\"2\">\n" +
    "			</td>\n" +
    "			<td>:</td>\n" +
    "			<td style=\"width:50px;\" class=\"form-group\" ng-class=\"{'has-error': invalidMinutes}\">\n" +
    "				<input type=\"text\" ng-model=\"minutes\" ng-change=\"updateMinutes()\" class=\"form-control text-center\" ng-readonly=\"readonlyInput\" maxlength=\"2\">\n" +
    "			</td>\n" +
    "			<td ng-show=\"showMeridian\"><button type=\"button\" class=\"btn btn-default text-center\" ng-click=\"toggleMeridian()\">{{meridian}}</button></td>\n" +
    "		</tr>\n" +
    "		<tr class=\"text-center\">\n" +
    "			<td><a ng-click=\"decrementHours()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-down\"></span></a></td>\n" +
    "			<td>&nbsp;</td>\n" +
    "			<td><a ng-click=\"decrementMinutes()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-down\"></span></a></td>\n" +
    "			<td ng-show=\"showMeridian\"></td>\n" +
    "		</tr>\n" +
    "	</tbody>\n" +
    "</table>\n" +
    "");
}]);

angular.module("template/typeahead/typeahead-match.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/typeahead/typeahead-match.html",
    "<a tabindex=\"-1\" bind-html-unsafe=\"match.label | typeaheadHighlight:query\"></a>");
}]);

angular.module("template/typeahead/typeahead-popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/typeahead/typeahead-popup.html",
    "<ul class=\"dropdown-menu\" ng-style=\"{display: isOpen()&&'block' || 'none', top: position.top+'px', left: position.left+'px'}\">\n" +
    "    <li ng-repeat=\"match in matches\" ng-class=\"{active: isActive($index) }\" ng-mouseenter=\"selectActive($index)\" ng-click=\"selectMatch($index)\">\n" +
    "        <div typeahead-match index=\"$index\" match=\"match\" query=\"query\" template-url=\"templateUrl\"></div>\n" +
    "    </li>\n" +
    "</ul>");
}]);

/*
	@license Angular Treeview version 0.1.6
	ⓒ 2013 AHN JAE-HA http://github.com/eu81273/angular.treeview
	License: MIT


	[TREE attribute]
	angular-treeview: the treeview directive
	tree-id : each tree's unique id.
	tree-model : the tree model on $scope.
	node-id : each node's id
	node-label : each node's label
	node-children: each node's children

	<div
		data-angular-treeview="true"
		data-tree-id="tree"
		data-tree-model="roleList"
		data-node-id="roleId"
		data-node-label="roleName"
		data-node-children="children" >
	</div>
*/

(function ( angular ) {
	'use strict';

	angular.module( 'angularTreeview', [] ).directive( 'treeModel', ['$compile', function( $compile ) {
		return {
			restrict: 'A',
			link: function ( scope, element, attrs ) {
				//tree id
				var treeId = attrs.treeId;
			
				//tree model
				var treeModel = attrs.treeModel;

				//node id
				var nodeId = attrs.nodeId || 'id';

				//node label
				var nodeLabel = attrs.nodeLabel || 'label';

				//children
				var nodeChildren = attrs.nodeChildren || 'children';

				//tree template
				var template =
					'<ul>' +
						'<li data-ng-repeat="node in ' + treeModel + '">' +
							'<i class="collapsed" data-ng-show="node.' + nodeChildren + '.length && node.collapsed" data-ng-click="' + treeId + '.selectNodeHead(node)"></i>' +
							'<i class="expanded" data-ng-show="node.' + nodeChildren + '.length && !node.collapsed" data-ng-click="' + treeId + '.selectNodeHead(node)"></i>' +
							'<i class="normal" data-ng-hide="node.' + nodeChildren + '.length"></i> ' +
							'<span data-ng-class="node.selected" data-ng-click="' + treeId + '.selectNodeLabel(node)">{{node.' + nodeLabel + '}}</span>' +
							'<div data-ng-hide="node.collapsed" data-tree-id="' + treeId + '" data-tree-model="node.' + nodeChildren + '" data-node-id=' + nodeId + ' data-node-label=' + nodeLabel + ' data-node-children=' + nodeChildren + '></div>' +
						'</li>' +
					'</ul>';


				//check tree id, tree model
				if( treeId && treeModel ) {

					//root node
					if( attrs.angularTreeview ) {
					
						//create tree object if not exists
						scope[treeId] = scope[treeId] || {};

						//if node head clicks,
						scope[treeId].selectNodeHead = scope[treeId].selectNodeHead || function( selectedNode ){

							//Collapse or Expand
							selectedNode.collapsed = !selectedNode.collapsed;
						};

						//if node label clicks,
						scope[treeId].selectNodeLabel = scope[treeId].selectNodeLabel || function( selectedNode ){

							//remove highlight from previous node
							if( scope[treeId].currentNode && scope[treeId].currentNode.selected ) {
								scope[treeId].currentNode.selected = undefined;
							}

							//set highlight to selected node
							selectedNode.selected = 'selected';

							//set currentNode
							scope[treeId].currentNode = selectedNode;
						};
					}

					//Rendering template.
					element.html('').append( $compile( template )( scope ) );
				}
			}
		};
	}]);
})( angular );

(function(angular, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(['angular'], function(angular) {
            return factory(angular);
        });
    } else {
        return factory(angular);
    }
}(angular || null, function(angular) {
    'use strict';
/**
 * ngTable: Table + Angular JS
 *
 * @author Vitalii Savchuk <esvit666@gmail.com>
 * @url https://github.com/esvit/ng-table/
 * @license New BSD License <http://creativecommons.org/licenses/BSD/>
 */

/**
 * @ngdoc module
 * @name ngTable
 * @description ngTable: Table + Angular JS
 * @example
 <doc:example>
 <doc:source>
 <script>
 var app = angular.module('myApp', ['ngTable']);
 app.controller('MyCtrl', function($scope) {
                    $scope.users = [
                        {name: "Moroni", age: 50},
                        {name: "Tiancum", age: 43},
                        {name: "Jacob", age: 27},
                        {name: "Nephi", age: 29},
                        {name: "Enos", age: 34}
                    ];
                });
 </script>
 <table ng-table class="table">
 <tr ng-repeat="user in users">
 <td data-title="'Name'">{{user.name}}</td>
 <td data-title="'Age'">{{user.age}}</td>
 </tr>
 </table>
 </doc:source>
 </doc:example>
 */
var app = angular.module('ngTable', []);
/**
 * ngTable: Table + Angular JS
 *
 * @author Vitalii Savchuk <esvit666@gmail.com>
 * @url https://github.com/esvit/ng-table/
 * @license New BSD License <http://creativecommons.org/licenses/BSD/>
 */

/**
 * @ngdoc service
 * @name ngTable.factory:ngTableParams
 * @description Parameters manager for ngTable
 */
app.factory('ngTableParams', ['$q', '$log', function ($q, $log) {
    var isNumber = function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    var ngTableParams = function (baseParameters, baseSettings) {
        var self = this,
            log = function () {
                if (settings.debugMode && $log.debug) {
                    $log.debug.apply(this, arguments);
                }
            };

        this.data = [];

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#parameters
         * @methodOf ngTable.factory:ngTableParams
         * @description Set new parameters or get current parameters
         *
         * @param {string} newParameters      New parameters
         * @param {string} parseParamsFromUrl Flag if parse parameters like in url
         * @returns {Object} Current parameters or `this`
         */
        this.parameters = function (newParameters, parseParamsFromUrl) {
            parseParamsFromUrl = parseParamsFromUrl || false;
            if (angular.isDefined(newParameters)) {
                for (var key in newParameters) {
                    var value = newParameters[key];
                    if (parseParamsFromUrl && key.indexOf('[') >= 0) {
                        var keys = key.split(/\[(.*)\]/).reverse()
                        var lastKey = '';
                        for (var i = 0, len = keys.length; i < len; i++) {
                            var name = keys[i];
                            if (name !== '') {
                                var v = value;
                                value = {};
                                value[lastKey = name] = (isNumber(v) ? parseFloat(v) : v);
                            }
                        }
                        if (lastKey === 'sorting') {
                            params[lastKey] = {};
                        }
                        params[lastKey] = angular.extend(params[lastKey] || {}, value[lastKey]);
                    } else {
                        params[key] = (isNumber(newParameters[key]) ? parseFloat(newParameters[key]) : newParameters[key]);
                    }
                }
                log('ngTable: set parameters', params);
                return this;
            }
            return params;
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#settings
         * @methodOf ngTable.factory:ngTableParams
         * @description Set new settings for table
         *
         * @param {string} newSettings New settings or undefined
         * @returns {Object} Current settings or `this`
         */
        this.settings = function (newSettings) {
            if (angular.isDefined(newSettings)) {
                if (angular.isArray(newSettings.data)) {
                    //auto-set the total from passed in data
                    newSettings.total = newSettings.data.length;
                }
                settings = angular.extend(settings, newSettings);
                log('ngTable: set settings', settings);
                return this;
            }
            return settings;
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#page
         * @methodOf ngTable.factory:ngTableParams
         * @description If parameter page not set return current page else set current page
         *
         * @param {string} page Page number
         * @returns {Object|Number} Current page or `this`
         */
        this.page = function (page) {
            return angular.isDefined(page) ? this.parameters({'page': page}) : params.page;
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#total
         * @methodOf ngTable.factory:ngTableParams
         * @description If parameter total not set return current quantity else set quantity
         *
         * @param {string} total Total quantity of items
         * @returns {Object|Number} Current page or `this`
         */
        this.total = function (total) {
            return angular.isDefined(total) ? this.settings({'total': total}) : settings.total;
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#count
         * @methodOf ngTable.factory:ngTableParams
         * @description If parameter count not set return current count per page else set count per page
         *
         * @param {string} count Count per number
         * @returns {Object|Number} Count per page or `this`
         */
        this.count = function (count) {
            // reset to first page because can be blank page
            return angular.isDefined(count) ? this.parameters({'count': count, 'page': 1}) : params.count;
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#filter
         * @methodOf ngTable.factory:ngTableParams
         * @description If parameter page not set return current filter else set current filter
         *
         * @param {string} filter New filter
         * @returns {Object} Current filter or `this`
         */
        this.filter = function (filter) {
            return angular.isDefined(filter) ? this.parameters({'filter': filter}) : params.filter;
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#sorting
         * @methodOf ngTable.factory:ngTableParams
         * @description If 'sorting' parameter is not set, return current sorting. Otherwise set current sorting.
         *
         * @param {string} sorting New sorting
         * @returns {Object} Current sorting or `this`
         */
        this.sorting = function (sorting) {
            if (arguments.length == 2) {
                var sortArray = {};
                sortArray[sorting] = arguments[1];
                this.parameters({'sorting': sortArray});
                return this;
            }
            return angular.isDefined(sorting) ? this.parameters({'sorting': sorting}) : params.sorting;
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#isSortBy
         * @methodOf ngTable.factory:ngTableParams
         * @description Checks sort field
         *
         * @param {string} field     Field name
         * @param {string} direction Direction of sorting 'asc' or 'desc'
         * @returns {Array} Return true if field sorted by direction
         */
        this.isSortBy = function (field, direction) {
            return angular.isDefined(params.sorting[field]) && params.sorting[field] == direction;
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#orderBy
         * @methodOf ngTable.factory:ngTableParams
         * @description Return object of sorting parameters for angular filter
         *
         * @returns {Array} Array like: [ '-name', '+age' ]
         */
        this.orderBy = function () {
            var sorting = [];
            for (var column in params.sorting) {
                sorting.push((params.sorting[column] === "asc" ? "+" : "-") + column);
            }
            return sorting;
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#getData
         * @methodOf ngTable.factory:ngTableParams
         * @description Called when updated some of parameters for get new data
         *
         * @param {Object} $defer promise object
         * @param {Object} params New parameters
         */
        this.getData = function ($defer, params) {
            if (angular.isArray(this.data) && angular.isObject(params)) {
                $defer.resolve(this.data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            } else {
                $defer.resolve([]);
            }
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#getGroups
         * @methodOf ngTable.factory:ngTableParams
         * @description Return groups for table grouping
         */
        this.getGroups = function ($defer, column) {
            var defer = $q.defer();

            defer.promise.then(function (data) {
                var groups = {};
                angular.forEach(data, function (item) {
                    var groupName = angular.isFunction(column) ? column(item) : item[column];

                    groups[groupName] = groups[groupName] || {
                        data: []
                    };
                    groups[groupName]['value'] = groupName;
                    groups[groupName].data.push(item);
                });
                var result = [];
                for (var i in groups) {
                    result.push(groups[i]);
                }
                log('ngTable: refresh groups', result);
                $defer.resolve(result);
            });
            this.getData(defer, self);
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#generatePagesArray
         * @methodOf ngTable.factory:ngTableParams
         * @description Generate array of pages
         *
         * @param {boolean} currentPage which page must be active
         * @param {boolean} totalItems  Total quantity of items
         * @param {boolean} pageSize    Quantity of items on page
         * @returns {Array} Array of pages
         */
        this.generatePagesArray = function (currentPage, totalItems, pageSize) {
            var maxBlocks, maxPage, maxPivotPages, minPage, numPages, pages;
            maxBlocks = 11;
            pages = [];
            numPages = Math.ceil(totalItems / pageSize);
            if (numPages > 1) {
                pages.push({
                    type: 'prev',
                    number: Math.max(1, currentPage - 1),
                    active: currentPage > 1
                });
                pages.push({
                    type: 'first',
                    number: 1,
                    active: currentPage > 1
                });
                maxPivotPages = Math.round((maxBlocks - 5) / 2);
                minPage = Math.max(2, currentPage - maxPivotPages);
                maxPage = Math.min(numPages - 1, currentPage + maxPivotPages * 2 - (currentPage - minPage));
                minPage = Math.max(2, minPage - (maxPivotPages * 2 - (maxPage - minPage)));
                var i = minPage;
                while (i <= maxPage) {
                    if ((i === minPage && i !== 2) || (i === maxPage && i !== numPages - 1)) {
                        pages.push({
                            type: 'more',
                            active: false
                        });
                    } else {
                        pages.push({
                            type: 'page',
                            number: i,
                            active: currentPage !== i
                        });
                    }
                    i++;
                }
                pages.push({
                    type: 'last',
                    number: numPages,
                    active: currentPage !== numPages
                });
                pages.push({
                    type: 'next',
                    number: Math.min(numPages, currentPage + 1),
                    active: currentPage < numPages
                });
            }
            return pages;
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#url
         * @methodOf ngTable.factory:ngTableParams
         * @description Return groups for table grouping
         *
         * @param {boolean} asString flag indicates return array of string or object
         * @returns {Array} If asString = true will be return array of url string parameters else key-value object
         */
        this.url = function (asString) {
            asString = asString || false;
            var pairs = (asString ? [] : {});
            for (var key in params) {
                if (params.hasOwnProperty(key)) {
                    var item = params[key],
                        name = encodeURIComponent(key);
                    if (typeof item === "object") {
                        for (var subkey in item) {
                            if (!angular.isUndefined(item[subkey]) && item[subkey] !== "") {
                                var pname = name + "[" + encodeURIComponent(subkey) + "]";
                                if (asString) {
                                    pairs.push(pname + "=" + item[subkey]);
                                } else {
                                    pairs[pname] = item[subkey];
                                }
                            }
                        }
                    } else if (!angular.isFunction(item) && !angular.isUndefined(item) && item !== "") {
                        if (asString) {
                            pairs.push(name + "=" + encodeURIComponent(item));
                        } else {
                            pairs[name] = encodeURIComponent(item);
                        }
                    }
                }
            }
            return pairs;
        };

        /**
         * @ngdoc method
         * @name ngTable.factory:ngTableParams#reload
         * @methodOf ngTable.factory:ngTableParams
         * @description Reload table data
         */
        this.reload = function () {
            var $defer = $q.defer(),
                self = this;

            settings.$loading = true;
            if (settings.groupBy) {
                settings.getGroups($defer, settings.groupBy, this);
            } else {
                settings.getData($defer, this);
            }
            log('ngTable: reload data');
            $defer.promise.then(function (data) {
                settings.$loading = false;
                log('ngTable: current scope', settings.$scope);
                if (settings.groupBy) {
                    self.data = settings.$scope.$groups = data;
                } else {
                    self.data = settings.$scope.$data = data;
                }
                settings.$scope.pages = self.generatePagesArray(self.page(), self.total(), self.count());
                settings.$scope.$emit('ngTableAfterReloadData');
            });
        };

        this.reloadPages = function () {
            var self = this;
            settings.$scope.pages = self.generatePagesArray(self.page(), self.total(), self.count());
        };

        var params = this.$params = {
            page: 1,
            count: 1,
            filter: {},
            sorting: {},
            group: {},
            groupBy: null
        };
        var settings = {
            $scope: null, // set by ngTable controller
            $loading: false,
            data: null, //allows data to be set when table is initialized
            total: 0,
            defaultSort: 'desc',
            filterDelay: 750,
            counts: [10, 25, 50, 100],
            getGroups: this.getGroups,
            getData: this.getData
        };

        this.settings(baseSettings);
        this.parameters(baseParameters, true);
        return this;
    };
    return ngTableParams;
}]);

/**
 * ngTable: Table + Angular JS
 *
 * @author Vitalii Savchuk <esvit666@gmail.com>
 * @url https://github.com/esvit/ng-table/
 * @license New BSD License <http://creativecommons.org/licenses/BSD/>
 */

/**
 * @ngdoc object
 * @name ngTable.directive:ngTable.ngTableController
 *
 * @description
 * Each {@link ngTable.directive:ngTable ngTable} directive creates an instance of `ngTableController`
 */
var ngTableController = ['$scope', 'ngTableParams', '$timeout', function ($scope, ngTableParams, $timeout) {
    $scope.$loading = false;

    if (!$scope.params) {
        $scope.params = new ngTableParams();
    }
    $scope.params.settings().$scope = $scope;

    var delayFilter = (function () {
        var timer = 0;
        return function (callback, ms) {
            $timeout.cancel(timer);
            timer = $timeout(callback, ms);
        };
    })();

    $scope.$watch('params.$params', function (newParams, oldParams) {
        $scope.params.settings().$scope = $scope;

        if (!angular.equals(newParams.filter, oldParams.filter)) {
            delayFilter(function () {
                $scope.params.$params.page = 1;
                $scope.params.reload();
            }, $scope.params.settings().filterDelay);
        } else {
            $scope.params.reload();
        }
    }, true);

    $scope.sortBy = function (column, event) {
        var parsedSortable = $scope.parse(column.sortable);
        if (!parsedSortable) {
            return;
        }
        var defaultSort = $scope.params.settings().defaultSort;
        var inverseSort = (defaultSort === 'asc' ? 'desc' : 'asc');
        var sorting = $scope.params.sorting() && $scope.params.sorting()[parsedSortable] && ($scope.params.sorting()[parsedSortable] === defaultSort);
        var sortingParams = (event.ctrlKey || event.metaKey) ? $scope.params.sorting() : {};
        sortingParams[parsedSortable] = (sorting ? inverseSort : defaultSort);
        $scope.params.parameters({
            sorting: sortingParams
        });
    };
}];
/**
 * ngTable: Table + Angular JS
 *
 * @author Vitalii Savchuk <esvit666@gmail.com>
 * @url https://github.com/esvit/ng-table/
 * @license New BSD License <http://creativecommons.org/licenses/BSD/>
 */

/**
 * @ngdoc directive
 * @name ngTable.directive:ngTable
 * @restrict A
 *
 * @description
 * Directive that instantiates {@link ngTable.directive:ngTable.ngTableController ngTableController}.
 */
app.directive('ngTable', ['$compile', '$q', '$parse',
    function ($compile, $q, $parse) {
        'use strict';

        return {
            restrict: 'A',
            priority: 1001,
            scope: true,
            controller: ngTableController,
            compile: function (element) {
                var columns = [], i = 0, row = null;

                // custom header
                var thead = element.find('thead');

                // IE 8 fix :not(.ng-table-group) selector
                angular.forEach(angular.element(element.find('tr')), function (tr) {
                    tr = angular.element(tr);
                    if (!tr.hasClass('ng-table-group') && !row) {
                        row = tr;
                    }
                });
                if (!row) {
                    return;
                }
                angular.forEach(row.find('td'), function (item) {
                    var el = angular.element(item);
                    if (el.attr('ignore-cell') && 'true' === el.attr('ignore-cell')) {
                        return;
                    }
                    var parsedAttribute = function (attr, defaultValue) {
                        return function (scope) {
                            return $parse(el.attr('x-data-' + attr) || el.attr('data-' + attr) || el.attr(attr))(scope, {
                                $columns: columns
                            }) || defaultValue;
                        };
                    };

                    var parsedTitle = parsedAttribute('title', ' '),
                        headerTemplateURL = parsedAttribute('header', false),
                        filter = parsedAttribute('filter', false)(),
                        filterTemplateURL = false,
                        filterName = false;

                    if (filter && filter.$$name) {
                        filterName = filter.$$name;
                        delete filter.$$name;
                    }
                    if (filter && filter.templateURL) {
                        filterTemplateURL = filter.templateURL;
                        delete filter.templateURL;
                    }

                    el.attr('data-title-text', parsedTitle()); // this used in responsive table
                    columns.push({
                        id: i++,
                        title: parsedTitle,
                        sortable: parsedAttribute('sortable', false),
                        'class': el.attr('x-data-header-class') || el.attr('data-header-class') || el.attr('header-class'),
                        filter: filter,
                        filterTemplateURL: filterTemplateURL,
                        filterName: filterName,
                        headerTemplateURL: headerTemplateURL,
                        filterData: (el.attr("filter-data") ? el.attr("filter-data") : null),
                        show: (el.attr("ng-show") ? function (scope) {
                            return $parse(el.attr("ng-show"))(scope);
                        } : function () {
                            return true;
                        })
                    });
                });
                return function (scope, element, attrs) {
                    scope.$loading = false;
                    scope.$columns = columns;

                    scope.$watch(attrs.ngTable, (function (params) {
                        if (angular.isUndefined(params)) {
                            return;
                        }
                        scope.paramsModel = $parse(attrs.ngTable);
                        scope.params = params;
                    }), true);
                    scope.parse = function (text) {
                        return angular.isDefined(text) ? text(scope) : '';
                    };
                    if (attrs.showFilter) {
                        scope.$parent.$watch(attrs.showFilter, function (value) {
                            scope.show_filter = value;
                        });
                    }
                    angular.forEach(columns, function (column) {
                        var def;
                        if (!column.filterData) {
                            return;
                        }
                        def = $parse(column.filterData)(scope, {
                            $column: column
                        });
                        if (!(angular.isObject(def) && angular.isObject(def.promise))) {
                            throw new Error('Function ' + column.filterData + ' must be instance of $q.defer()');
                        }
                        delete column.filterData;
                        return def.promise.then(function (data) {
                            if (!angular.isArray(data)) {
                                data = [];
                            }
                            data.unshift({
                                title: '-',
                                id: ''
                            });
                            column.data = data;
                        });
                    });
                    if (!element.hasClass('ng-table')) {
                        scope.templates = {
                            header: (attrs.templateHeader ? attrs.templateHeader : 'ng-table/header.html'),
                            pagination: (attrs.templatePagination ? attrs.templatePagination : 'ng-table/pager.html')
                        };
                        var headerTemplate = thead.length > 0 ? thead : angular.element(document.createElement('thead')).attr('ng-include', 'templates.header');
                        var paginationTemplate = angular.element(document.createElement('div')).attr({
                            'ng-table-pagination': 'params',
                            'template-url': 'templates.pagination'
                        });

                        element.find('thead').remove();

                        element.addClass('ng-table')
                            .prepend(headerTemplate)
                            .after(paginationTemplate);

                        $compile(headerTemplate)(scope);
                        $compile(paginationTemplate)(scope);
                    }
                };
            }
        }
    }
]);

/**
 * ngTable: Table + Angular JS
 *
 * @author Vitalii Savchuk <esvit666@gmail.com>
 * @url https://github.com/esvit/ng-table/
 * @license New BSD License <http://creativecommons.org/licenses/BSD/>
 */

/**
 * @ngdoc directive
 * @name ngTable.directive:ngTablePagination
 * @restrict A
 */
app.directive('ngTablePagination', ['$compile',
    function ($compile) {
        'use strict';

        return {
            restrict: 'A',
            scope: {
                'params': '=ngTablePagination',
                'templateUrl': '='
            },
            replace: false,
            link: function (scope, element, attrs) {

                scope.params.settings().$scope.$on('ngTableAfterReloadData', function () {
                    scope.pages = scope.params.generatePagesArray(scope.params.page(), scope.params.total(), scope.params.count());
                }, true);

                scope.$watch('templateUrl', function(templateUrl) {
                    if (angular.isUndefined(templateUrl)) {
                        return;
                    }
                    var template = angular.element(document.createElement('div'))
                    template.attr({
                        'ng-include': 'templateUrl'
                    });
                    element.append(template);
                    $compile(template)(scope);
                });
            }
        };
    }
]);

angular.module('ngTable').run(['$templateCache', function ($templateCache) {
	$templateCache.put('ng-table/filters/select-multiple.html', '<select ng-options="data.id as data.title for data in column.data" multiple ng-multiple="true" ng-model="params.filter()[name]" ng-show="filter==\'select-multiple\'" class="filter filter-select-multiple form-control" name="{{column.filterName}}"> </select>');
	$templateCache.put('ng-table/filters/select.html', '<select ng-options="data.id as data.title for data in column.data" ng-model="params.filter()[name]" ng-show="filter==\'select\'" class="filter filter-select form-control" name="{{column.filterName}}"> </select>');
	$templateCache.put('ng-table/filters/text.html', '<input type="text" name="{{column.filterName}}" ng-model="params.filter()[name]" ng-if="filter==\'text\'" class="input-filter form-control"/>');
	$templateCache.put('ng-table/header.html', '<tr> <th ng-repeat="column in $columns" ng-class="{ \'sortable\': parse(column.sortable), \'sort-asc\': params.sorting()[parse(column.sortable)]==\'asc\', \'sort-desc\': params.sorting()[parse(column.sortable)]==\'desc\' }" ng-click="sortBy(column, $event)" ng-show="column.show(this)" ng-init="template=column.headerTemplateURL(this)" class="header {{column.class}}"> <div ng-if="!template" ng-show="!template" ng-bind="parse(column.title)"></div> <div ng-if="template" ng-show="template"><div ng-include="template"></div></div> </th> </tr> <tr ng-show="show_filter" class="ng-table-filters"> <th ng-repeat="column in $columns" ng-show="column.show(this)" class="filter"> <div ng-repeat="(name, filter) in column.filter"> <div ng-if="column.filterTemplateURL" ng-show="column.filterTemplateURL"> <div ng-include="column.filterTemplateURL"></div> </div> <div ng-if="!column.filterTemplateURL" ng-show="!column.filterTemplateURL"> <div ng-include="\'ng-table/filters/\' + filter + \'.html\'"></div> </div> </div> </th> </tr>');
	$templateCache.put('ng-table/pager.html', '<div class="ng-cloak ng-table-pager"> <div ng-if="params.settings().counts.length" class="ng-table-counts btn-group pull-right"> <button ng-repeat="count in params.settings().counts" type="button" ng-class="{\'active\':params.count()==count}" ng-click="params.count(count)" class="btn btn-default"> <span ng-bind="count"></span> </button> </div> <ul class="pagination ng-table-pagination"> <li ng-class="{\'disabled\': !page.active}" ng-repeat="page in pages" ng-switch="page.type"> <a ng-switch-when="prev" ng-click="params.page(page.number)" href="">&laquo;</a> <a ng-switch-when="first" ng-click="params.page(page.number)" href=""><span ng-bind="page.number"></span></a> <a ng-switch-when="page" ng-click="params.page(page.number)" href=""><span ng-bind="page.number"></span></a> <a ng-switch-when="more" ng-click="params.page(page.number)" href="">&#8230;</a> <a ng-switch-when="last" ng-click="params.page(page.number)" href=""><span ng-bind="page.number"></span></a> <a ng-switch-when="next" ng-click="params.page(page.number)" href="">&raquo;</a> </li> </ul> </div> ');
}]);
    return app;
}));
angular.module("gettext",[]),angular.module("gettext").constant("gettext",function(a){return a}),angular.module("gettext").factory("gettextCatalog",["gettextPlurals","$http","$cacheFactory",function(a,b,c){var d,e=function(a){return d.debug&&d.currentLanguage!==d.baseLanguage?"[MISSING]: "+a:a};return d={debug:!1,strings:{},baseLanguage:"en",currentLanguage:"en",cache:c("strings"),setStrings:function(a,b){var c,d;this.strings[a]||(this.strings[a]={});for(c in b)d=b[c],this.strings[a][c]="string"==typeof d?[d]:d},getStringForm:function(a,b){var c=this.strings[this.currentLanguage]||{},d=c[a]||[];return d[b]},getString:function(a){return this.getStringForm(a,0)||e(a)},getPlural:function(b,c,d){var f=a(this.currentLanguage,b);return this.getStringForm(c,f)||e(1===b?c:d)},loadRemote:function(a){return b({method:"GET",url:a,cache:d.cache}).success(function(a){for(var b in a)d.setStrings(b,a[b])})}}}]),angular.module("gettext").directive("translate",["gettextCatalog","$interpolate","$parse","$compile",function(a,b,c,d){var e=function(){return String.prototype.trim?function(a){return"string"==typeof a?a.trim():a}:function(a){return"string"==typeof a?a.replace(/^\s*/,"").replace(/\s*$/,""):a}}();return{transclude:"element",priority:499,compile:function(f,g,h){return function(f,i){var j=function(a,b,c){if(!a)throw new Error("You should add a "+b+" attribute whenever you add a "+c+" attribute.")};if(j(!g.translatePlural||g.translateN,"translate-n","translate-plural"),j(!g.translateN||g.translatePlural,"translate-plural","translate-n"),g.ngIf)throw new Error("You should not combine translate with ng-if, this will lead to problems.");if(g.ngSwitchWhen)throw new Error("You should not combine translate with ng-switch-when, this will lead to problems.");var k=c(g.translateN),l=null;h(f,function(c){var h=e(c.html());return c.removeAttr("translate"),i.replaceWith(c),f.$watch(function(){var e,i=c.html();g.translatePlural?(f=l||(l=f.$new()),f.$count=k(f),e=a.getPlural(f.$count,h,g.translatePlural)):e=a.getString(h);var j=b(e)(f);return i!==j?(c.html(j),void 0!==g.translateCompile&&d(c.contents())(f),c):void 0})})}}}}]),angular.module("gettext").filter("translate",["gettextCatalog","$interpolate","$parse",function(a){return function(b){return a.getString(b)}}]),angular.module("gettext").factory("gettextPlurals",function(){return function(a,b){switch(a){case"ay":case"bo":case"cgg":case"dz":case"fa":case"id":case"ja":case"jbo":case"ka":case"kk":case"km":case"ko":case"ky":case"lo":case"ms":case"my":case"sah":case"su":case"th":case"tt":case"ug":case"vi":case"wo":case"zh":return 0;case"is":return b%10!=1||b%100==11?1:0;case"jv":return 0!=b?1:0;case"mk":return 1==b||b%10==1?0:1;case"ach":case"ak":case"am":case"arn":case"br":case"fil":case"fr":case"gun":case"ln":case"mfe":case"mg":case"mi":case"oc":case"pt_BR":case"tg":case"ti":case"tr":case"uz":case"wa":case"zh":return b>1?1:0;case"lv":return b%10==1&&b%100!=11?0:0!=b?1:2;case"lt":return b%10==1&&b%100!=11?0:b%10>=2&&(10>b%100||b%100>=20)?1:2;case"be":case"bs":case"hr":case"ru":case"sr":case"uk":return b%10==1&&b%100!=11?0:b%10>=2&&4>=b%10&&(10>b%100||b%100>=20)?1:2;case"mnk":return 0==b?0:1==b?1:2;case"ro":return 1==b?0:0==b||b%100>0&&20>b%100?1:2;case"pl":return 1==b?0:b%10>=2&&4>=b%10&&(10>b%100||b%100>=20)?1:2;case"cs":case"sk":return 1==b?0:b>=2&&4>=b?1:2;case"sl":return b%100==1?1:b%100==2?2:b%100==3||b%100==4?3:0;case"mt":return 1==b?0:0==b||b%100>1&&11>b%100?1:b%100>10&&20>b%100?2:3;case"gd":return 1==b||11==b?0:2==b||12==b?1:b>2&&20>b?2:3;case"cy":return 1==b?0:2==b?1:8!=b&&11!=b?2:3;case"kw":return 1==b?0:2==b?1:3==b?2:3;case"ga":return 1==b?0:2==b?1:7>b?2:11>b?3:4;case"ar":return 0==b?0:1==b?1:2==b?2:b%100>=3&&10>=b%100?3:b%100>=11?4:5;default:return 1!=b?1:0}}});
/**
 * Enhanced Select2 Dropmenus
 *
 * @AJAX Mode - When in this mode, your value will be an object (or array of objects) of the data used by Select2
 *     This change is so that you do not have to do an additional query yourself on top of Select2's own query
 * @params [options] {object} The configuration options passed to $.fn.select2(). Refer to the documentation
 */
angular.module('ui.select2', []).value('uiSelect2Config', {}).directive('uiSelect2', ['uiSelect2Config', '$timeout', function (uiSelect2Config, $timeout) {
  var options = {};
  if (uiSelect2Config) {
    angular.extend(options, uiSelect2Config);
  }
  return {
    require: 'ngModel',
    priority: 1,
    compile: function (tElm, tAttrs) {
      var watch,
        repeatOption,
        repeatAttr,
        isSelect = tElm.is('select'),
        isMultiple = angular.isDefined(tAttrs.multiple);

      // Enable watching of the options dataset if in use
      if (tElm.is('select')) {
        repeatOption = tElm.find('option[ng-repeat], option[data-ng-repeat]');

        if (repeatOption.length) {
          repeatAttr = repeatOption.attr('ng-repeat') || repeatOption.attr('data-ng-repeat');
          watch = jQuery.trim(repeatAttr.split('|')[0]).split(' ').pop();
        }
      }

      return function (scope, elm, attrs, controller) {
        // instance-specific options
        var opts = angular.extend({}, options, scope.$eval(attrs.uiSelect2));

        /*
        Convert from Select2 view-model to Angular view-model.
        */
        var convertToAngularModel = function(select2_data) {
          var model;
          if (opts.simple_tags) {
            model = [];
            angular.forEach(select2_data, function(value, index) {
              model.push(value.id);
            });
          } else {
            model = select2_data;
          }
          return model;
        };

        /*
        Convert from Angular view-model to Select2 view-model.
        */
        var convertToSelect2Model = function(angular_data) {
          var model = [];
          if (!angular_data) {
            return model;
          }

          if (opts.simple_tags) {
            model = [];
            angular.forEach(
              angular_data,
              function(value, index) {
                model.push({'id': value, 'text': value});
              });
          } else {
            model = angular_data;
          }
          return model;
        };

        if (isSelect) {
          // Use <select multiple> instead
          delete opts.multiple;
          delete opts.initSelection;
        } else if (isMultiple) {
          opts.multiple = true;
        }

        if (controller) {
          // Watch the model for programmatic changes
           scope.$watch(tAttrs.ngModel, function(current, old) {
            if (!current) {
              return;
            }
            if (current === old) {
              return;
            }
            controller.$render();
          }, true);
          controller.$render = function () {
            if (isSelect) {
              elm.select2('val', controller.$viewValue);
            } else {
              if (opts.multiple) {
                var viewValue = controller.$viewValue;
                if (angular.isString(viewValue)) {
                  viewValue = viewValue.split(',');
                }
                elm.select2(
                  'data', convertToSelect2Model(viewValue));
              } else {
                if (angular.isObject(controller.$viewValue)) {
                  elm.select2('data', controller.$viewValue);
                } else if (!controller.$viewValue) {
                  elm.select2('data', null);
                } else {
                  elm.select2('val', controller.$viewValue);
                }
              }
            }
          };

          // Watch the options dataset for changes
          if (watch) {
            scope.$watch(watch, function (newVal, oldVal, scope) {
              if (angular.equals(newVal, oldVal)) {
                return;
              }
              // Delayed so that the options have time to be rendered
              $timeout(function () {
                elm.select2('val', controller.$viewValue);
                // Refresh angular to remove the superfluous option
                elm.trigger('change');
                if(newVal && !oldVal && controller.$setPristine) {
                  controller.$setPristine(true);
                }
              });
            });
          }

          // Update valid and dirty statuses
          controller.$parsers.push(function (value) {
            var div = elm.prev();
            div
              .toggleClass('ng-invalid', !controller.$valid)
              .toggleClass('ng-valid', controller.$valid)
              .toggleClass('ng-invalid-required', !controller.$valid)
              .toggleClass('ng-valid-required', controller.$valid)
              .toggleClass('ng-dirty', controller.$dirty)
              .toggleClass('ng-pristine', controller.$pristine);
            return value;
          });

          if (!isSelect) {
            // Set the view and model value and update the angular template manually for the ajax/multiple select2.
            elm.bind("change", function (e) {
              e.stopImmediatePropagation();
              
              if (scope.$$phase || scope.$root.$$phase) {
                return;
              }
              scope.$apply(function () {
                controller.$setViewValue(
                  convertToAngularModel(elm.select2('data')));
              });
            });

            if (opts.initSelection) {
              var initSelection = opts.initSelection;
              opts.initSelection = function (element, callback) {
                initSelection(element, function (value) {
                  controller.$setViewValue(convertToAngularModel(value));
                  callback(value);
                });
              };
            }
          }
        }

        elm.bind("$destroy", function() {
          elm.select2("destroy");
        });

        attrs.$observe('disabled', function (value) {
          elm.select2('enable', !value);
        });

        attrs.$observe('readonly', function (value) {
          elm.select2('readonly', !!value);
        });

        if (attrs.ngMultiple) {
          scope.$watch(attrs.ngMultiple, function(newVal) {
            attrs.$set('multiple', !!newVal);
            elm.select2(opts);
          });
        }

        // Initialize the plugin late so that the injected DOM does not disrupt the template compiler
        $timeout(function () {
          elm.select2(opts);

          // Set initial value - I'm not sure about this but it seems to need to be there
          elm.val(controller.$viewValue);
          // important!
          controller.$render();

          // Not sure if I should just check for !isSelect OR if I should check for 'tags' key
          if (!opts.initSelection && !isSelect) {
            controller.$setViewValue(
              convertToAngularModel(elm.select2('data'))
            );
          }
        });
      };
    }
  };
}]);

/*
Copyright 2012 Igor Vaynberg

Version: 3.4.8 Timestamp: Thu May  1 09:50:32 EDT 2014

This software is licensed under the Apache License, Version 2.0 (the "Apache License") or the GNU
General Public License version 2 (the "GPL License"). You may choose either license to govern your
use of this software only upon the condition that you accept all of the terms of either the Apache
License or the GPL License.

You may obtain a copy of the Apache License and the GPL License at:

    http://www.apache.org/licenses/LICENSE-2.0
    http://www.gnu.org/licenses/gpl-2.0.html

Unless required by applicable law or agreed to in writing, software distributed under the
Apache License or the GPL License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the Apache License and the GPL License for
the specific language governing permissions and limitations under the Apache License and the GPL License.
*/
(function ($) {
    if(typeof $.fn.each2 == "undefined") {
        $.extend($.fn, {
            /*
            * 4-10 times faster .each replacement
            * use it carefully, as it overrides jQuery context of element on each iteration
            */
            each2 : function (c) {
                var j = $([0]), i = -1, l = this.length;
                while (
                    ++i < l
                    && (j.context = j[0] = this[i])
                    && c.call(j[0], i, j) !== false //"this"=DOM, i=index, j=jQuery object
                );
                return this;
            }
        });
    }
})(jQuery);

(function ($, undefined) {
    "use strict";
    /*global document, window, jQuery, console */

    if (window.Select2 !== undefined) {
        return;
    }

    var KEY, AbstractSelect2, SingleSelect2, MultiSelect2, nextUid, sizer,
        lastMousePosition={x:0,y:0}, $document, scrollBarDimensions,

    KEY = {
        TAB: 9,
        ENTER: 13,
        ESC: 27,
        SPACE: 32,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        SHIFT: 16,
        CTRL: 17,
        ALT: 18,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        HOME: 36,
        END: 35,
        BACKSPACE: 8,
        DELETE: 46,
        isArrow: function (k) {
            k = k.which ? k.which : k;
            switch (k) {
            case KEY.LEFT:
            case KEY.RIGHT:
            case KEY.UP:
            case KEY.DOWN:
                return true;
            }
            return false;
        },
        isControl: function (e) {
            var k = e.which;
            switch (k) {
            case KEY.SHIFT:
            case KEY.CTRL:
            case KEY.ALT:
                return true;
            }

            if (e.metaKey) return true;

            return false;
        },
        isFunctionKey: function (k) {
            k = k.which ? k.which : k;
            return k >= 112 && k <= 123;
        }
    },
    MEASURE_SCROLLBAR_TEMPLATE = "<div class='select2-measure-scrollbar'></div>",

    DIACRITICS = {"\u24B6":"A","\uFF21":"A","\u00C0":"A","\u00C1":"A","\u00C2":"A","\u1EA6":"A","\u1EA4":"A","\u1EAA":"A","\u1EA8":"A","\u00C3":"A","\u0100":"A","\u0102":"A","\u1EB0":"A","\u1EAE":"A","\u1EB4":"A","\u1EB2":"A","\u0226":"A","\u01E0":"A","\u00C4":"A","\u01DE":"A","\u1EA2":"A","\u00C5":"A","\u01FA":"A","\u01CD":"A","\u0200":"A","\u0202":"A","\u1EA0":"A","\u1EAC":"A","\u1EB6":"A","\u1E00":"A","\u0104":"A","\u023A":"A","\u2C6F":"A","\uA732":"AA","\u00C6":"AE","\u01FC":"AE","\u01E2":"AE","\uA734":"AO","\uA736":"AU","\uA738":"AV","\uA73A":"AV","\uA73C":"AY","\u24B7":"B","\uFF22":"B","\u1E02":"B","\u1E04":"B","\u1E06":"B","\u0243":"B","\u0182":"B","\u0181":"B","\u24B8":"C","\uFF23":"C","\u0106":"C","\u0108":"C","\u010A":"C","\u010C":"C","\u00C7":"C","\u1E08":"C","\u0187":"C","\u023B":"C","\uA73E":"C","\u24B9":"D","\uFF24":"D","\u1E0A":"D","\u010E":"D","\u1E0C":"D","\u1E10":"D","\u1E12":"D","\u1E0E":"D","\u0110":"D","\u018B":"D","\u018A":"D","\u0189":"D","\uA779":"D","\u01F1":"DZ","\u01C4":"DZ","\u01F2":"Dz","\u01C5":"Dz","\u24BA":"E","\uFF25":"E","\u00C8":"E","\u00C9":"E","\u00CA":"E","\u1EC0":"E","\u1EBE":"E","\u1EC4":"E","\u1EC2":"E","\u1EBC":"E","\u0112":"E","\u1E14":"E","\u1E16":"E","\u0114":"E","\u0116":"E","\u00CB":"E","\u1EBA":"E","\u011A":"E","\u0204":"E","\u0206":"E","\u1EB8":"E","\u1EC6":"E","\u0228":"E","\u1E1C":"E","\u0118":"E","\u1E18":"E","\u1E1A":"E","\u0190":"E","\u018E":"E","\u24BB":"F","\uFF26":"F","\u1E1E":"F","\u0191":"F","\uA77B":"F","\u24BC":"G","\uFF27":"G","\u01F4":"G","\u011C":"G","\u1E20":"G","\u011E":"G","\u0120":"G","\u01E6":"G","\u0122":"G","\u01E4":"G","\u0193":"G","\uA7A0":"G","\uA77D":"G","\uA77E":"G","\u24BD":"H","\uFF28":"H","\u0124":"H","\u1E22":"H","\u1E26":"H","\u021E":"H","\u1E24":"H","\u1E28":"H","\u1E2A":"H","\u0126":"H","\u2C67":"H","\u2C75":"H","\uA78D":"H","\u24BE":"I","\uFF29":"I","\u00CC":"I","\u00CD":"I","\u00CE":"I","\u0128":"I","\u012A":"I","\u012C":"I","\u0130":"I","\u00CF":"I","\u1E2E":"I","\u1EC8":"I","\u01CF":"I","\u0208":"I","\u020A":"I","\u1ECA":"I","\u012E":"I","\u1E2C":"I","\u0197":"I","\u24BF":"J","\uFF2A":"J","\u0134":"J","\u0248":"J","\u24C0":"K","\uFF2B":"K","\u1E30":"K","\u01E8":"K","\u1E32":"K","\u0136":"K","\u1E34":"K","\u0198":"K","\u2C69":"K","\uA740":"K","\uA742":"K","\uA744":"K","\uA7A2":"K","\u24C1":"L","\uFF2C":"L","\u013F":"L","\u0139":"L","\u013D":"L","\u1E36":"L","\u1E38":"L","\u013B":"L","\u1E3C":"L","\u1E3A":"L","\u0141":"L","\u023D":"L","\u2C62":"L","\u2C60":"L","\uA748":"L","\uA746":"L","\uA780":"L","\u01C7":"LJ","\u01C8":"Lj","\u24C2":"M","\uFF2D":"M","\u1E3E":"M","\u1E40":"M","\u1E42":"M","\u2C6E":"M","\u019C":"M","\u24C3":"N","\uFF2E":"N","\u01F8":"N","\u0143":"N","\u00D1":"N","\u1E44":"N","\u0147":"N","\u1E46":"N","\u0145":"N","\u1E4A":"N","\u1E48":"N","\u0220":"N","\u019D":"N","\uA790":"N","\uA7A4":"N","\u01CA":"NJ","\u01CB":"Nj","\u24C4":"O","\uFF2F":"O","\u00D2":"O","\u00D3":"O","\u00D4":"O","\u1ED2":"O","\u1ED0":"O","\u1ED6":"O","\u1ED4":"O","\u00D5":"O","\u1E4C":"O","\u022C":"O","\u1E4E":"O","\u014C":"O","\u1E50":"O","\u1E52":"O","\u014E":"O","\u022E":"O","\u0230":"O","\u00D6":"O","\u022A":"O","\u1ECE":"O","\u0150":"O","\u01D1":"O","\u020C":"O","\u020E":"O","\u01A0":"O","\u1EDC":"O","\u1EDA":"O","\u1EE0":"O","\u1EDE":"O","\u1EE2":"O","\u1ECC":"O","\u1ED8":"O","\u01EA":"O","\u01EC":"O","\u00D8":"O","\u01FE":"O","\u0186":"O","\u019F":"O","\uA74A":"O","\uA74C":"O","\u01A2":"OI","\uA74E":"OO","\u0222":"OU","\u24C5":"P","\uFF30":"P","\u1E54":"P","\u1E56":"P","\u01A4":"P","\u2C63":"P","\uA750":"P","\uA752":"P","\uA754":"P","\u24C6":"Q","\uFF31":"Q","\uA756":"Q","\uA758":"Q","\u024A":"Q","\u24C7":"R","\uFF32":"R","\u0154":"R","\u1E58":"R","\u0158":"R","\u0210":"R","\u0212":"R","\u1E5A":"R","\u1E5C":"R","\u0156":"R","\u1E5E":"R","\u024C":"R","\u2C64":"R","\uA75A":"R","\uA7A6":"R","\uA782":"R","\u24C8":"S","\uFF33":"S","\u1E9E":"S","\u015A":"S","\u1E64":"S","\u015C":"S","\u1E60":"S","\u0160":"S","\u1E66":"S","\u1E62":"S","\u1E68":"S","\u0218":"S","\u015E":"S","\u2C7E":"S","\uA7A8":"S","\uA784":"S","\u24C9":"T","\uFF34":"T","\u1E6A":"T","\u0164":"T","\u1E6C":"T","\u021A":"T","\u0162":"T","\u1E70":"T","\u1E6E":"T","\u0166":"T","\u01AC":"T","\u01AE":"T","\u023E":"T","\uA786":"T","\uA728":"TZ","\u24CA":"U","\uFF35":"U","\u00D9":"U","\u00DA":"U","\u00DB":"U","\u0168":"U","\u1E78":"U","\u016A":"U","\u1E7A":"U","\u016C":"U","\u00DC":"U","\u01DB":"U","\u01D7":"U","\u01D5":"U","\u01D9":"U","\u1EE6":"U","\u016E":"U","\u0170":"U","\u01D3":"U","\u0214":"U","\u0216":"U","\u01AF":"U","\u1EEA":"U","\u1EE8":"U","\u1EEE":"U","\u1EEC":"U","\u1EF0":"U","\u1EE4":"U","\u1E72":"U","\u0172":"U","\u1E76":"U","\u1E74":"U","\u0244":"U","\u24CB":"V","\uFF36":"V","\u1E7C":"V","\u1E7E":"V","\u01B2":"V","\uA75E":"V","\u0245":"V","\uA760":"VY","\u24CC":"W","\uFF37":"W","\u1E80":"W","\u1E82":"W","\u0174":"W","\u1E86":"W","\u1E84":"W","\u1E88":"W","\u2C72":"W","\u24CD":"X","\uFF38":"X","\u1E8A":"X","\u1E8C":"X","\u24CE":"Y","\uFF39":"Y","\u1EF2":"Y","\u00DD":"Y","\u0176":"Y","\u1EF8":"Y","\u0232":"Y","\u1E8E":"Y","\u0178":"Y","\u1EF6":"Y","\u1EF4":"Y","\u01B3":"Y","\u024E":"Y","\u1EFE":"Y","\u24CF":"Z","\uFF3A":"Z","\u0179":"Z","\u1E90":"Z","\u017B":"Z","\u017D":"Z","\u1E92":"Z","\u1E94":"Z","\u01B5":"Z","\u0224":"Z","\u2C7F":"Z","\u2C6B":"Z","\uA762":"Z","\u24D0":"a","\uFF41":"a","\u1E9A":"a","\u00E0":"a","\u00E1":"a","\u00E2":"a","\u1EA7":"a","\u1EA5":"a","\u1EAB":"a","\u1EA9":"a","\u00E3":"a","\u0101":"a","\u0103":"a","\u1EB1":"a","\u1EAF":"a","\u1EB5":"a","\u1EB3":"a","\u0227":"a","\u01E1":"a","\u00E4":"a","\u01DF":"a","\u1EA3":"a","\u00E5":"a","\u01FB":"a","\u01CE":"a","\u0201":"a","\u0203":"a","\u1EA1":"a","\u1EAD":"a","\u1EB7":"a","\u1E01":"a","\u0105":"a","\u2C65":"a","\u0250":"a","\uA733":"aa","\u00E6":"ae","\u01FD":"ae","\u01E3":"ae","\uA735":"ao","\uA737":"au","\uA739":"av","\uA73B":"av","\uA73D":"ay","\u24D1":"b","\uFF42":"b","\u1E03":"b","\u1E05":"b","\u1E07":"b","\u0180":"b","\u0183":"b","\u0253":"b","\u24D2":"c","\uFF43":"c","\u0107":"c","\u0109":"c","\u010B":"c","\u010D":"c","\u00E7":"c","\u1E09":"c","\u0188":"c","\u023C":"c","\uA73F":"c","\u2184":"c","\u24D3":"d","\uFF44":"d","\u1E0B":"d","\u010F":"d","\u1E0D":"d","\u1E11":"d","\u1E13":"d","\u1E0F":"d","\u0111":"d","\u018C":"d","\u0256":"d","\u0257":"d","\uA77A":"d","\u01F3":"dz","\u01C6":"dz","\u24D4":"e","\uFF45":"e","\u00E8":"e","\u00E9":"e","\u00EA":"e","\u1EC1":"e","\u1EBF":"e","\u1EC5":"e","\u1EC3":"e","\u1EBD":"e","\u0113":"e","\u1E15":"e","\u1E17":"e","\u0115":"e","\u0117":"e","\u00EB":"e","\u1EBB":"e","\u011B":"e","\u0205":"e","\u0207":"e","\u1EB9":"e","\u1EC7":"e","\u0229":"e","\u1E1D":"e","\u0119":"e","\u1E19":"e","\u1E1B":"e","\u0247":"e","\u025B":"e","\u01DD":"e","\u24D5":"f","\uFF46":"f","\u1E1F":"f","\u0192":"f","\uA77C":"f","\u24D6":"g","\uFF47":"g","\u01F5":"g","\u011D":"g","\u1E21":"g","\u011F":"g","\u0121":"g","\u01E7":"g","\u0123":"g","\u01E5":"g","\u0260":"g","\uA7A1":"g","\u1D79":"g","\uA77F":"g","\u24D7":"h","\uFF48":"h","\u0125":"h","\u1E23":"h","\u1E27":"h","\u021F":"h","\u1E25":"h","\u1E29":"h","\u1E2B":"h","\u1E96":"h","\u0127":"h","\u2C68":"h","\u2C76":"h","\u0265":"h","\u0195":"hv","\u24D8":"i","\uFF49":"i","\u00EC":"i","\u00ED":"i","\u00EE":"i","\u0129":"i","\u012B":"i","\u012D":"i","\u00EF":"i","\u1E2F":"i","\u1EC9":"i","\u01D0":"i","\u0209":"i","\u020B":"i","\u1ECB":"i","\u012F":"i","\u1E2D":"i","\u0268":"i","\u0131":"i","\u24D9":"j","\uFF4A":"j","\u0135":"j","\u01F0":"j","\u0249":"j","\u24DA":"k","\uFF4B":"k","\u1E31":"k","\u01E9":"k","\u1E33":"k","\u0137":"k","\u1E35":"k","\u0199":"k","\u2C6A":"k","\uA741":"k","\uA743":"k","\uA745":"k","\uA7A3":"k","\u24DB":"l","\uFF4C":"l","\u0140":"l","\u013A":"l","\u013E":"l","\u1E37":"l","\u1E39":"l","\u013C":"l","\u1E3D":"l","\u1E3B":"l","\u017F":"l","\u0142":"l","\u019A":"l","\u026B":"l","\u2C61":"l","\uA749":"l","\uA781":"l","\uA747":"l","\u01C9":"lj","\u24DC":"m","\uFF4D":"m","\u1E3F":"m","\u1E41":"m","\u1E43":"m","\u0271":"m","\u026F":"m","\u24DD":"n","\uFF4E":"n","\u01F9":"n","\u0144":"n","\u00F1":"n","\u1E45":"n","\u0148":"n","\u1E47":"n","\u0146":"n","\u1E4B":"n","\u1E49":"n","\u019E":"n","\u0272":"n","\u0149":"n","\uA791":"n","\uA7A5":"n","\u01CC":"nj","\u24DE":"o","\uFF4F":"o","\u00F2":"o","\u00F3":"o","\u00F4":"o","\u1ED3":"o","\u1ED1":"o","\u1ED7":"o","\u1ED5":"o","\u00F5":"o","\u1E4D":"o","\u022D":"o","\u1E4F":"o","\u014D":"o","\u1E51":"o","\u1E53":"o","\u014F":"o","\u022F":"o","\u0231":"o","\u00F6":"o","\u022B":"o","\u1ECF":"o","\u0151":"o","\u01D2":"o","\u020D":"o","\u020F":"o","\u01A1":"o","\u1EDD":"o","\u1EDB":"o","\u1EE1":"o","\u1EDF":"o","\u1EE3":"o","\u1ECD":"o","\u1ED9":"o","\u01EB":"o","\u01ED":"o","\u00F8":"o","\u01FF":"o","\u0254":"o","\uA74B":"o","\uA74D":"o","\u0275":"o","\u01A3":"oi","\u0223":"ou","\uA74F":"oo","\u24DF":"p","\uFF50":"p","\u1E55":"p","\u1E57":"p","\u01A5":"p","\u1D7D":"p","\uA751":"p","\uA753":"p","\uA755":"p","\u24E0":"q","\uFF51":"q","\u024B":"q","\uA757":"q","\uA759":"q","\u24E1":"r","\uFF52":"r","\u0155":"r","\u1E59":"r","\u0159":"r","\u0211":"r","\u0213":"r","\u1E5B":"r","\u1E5D":"r","\u0157":"r","\u1E5F":"r","\u024D":"r","\u027D":"r","\uA75B":"r","\uA7A7":"r","\uA783":"r","\u24E2":"s","\uFF53":"s","\u00DF":"s","\u015B":"s","\u1E65":"s","\u015D":"s","\u1E61":"s","\u0161":"s","\u1E67":"s","\u1E63":"s","\u1E69":"s","\u0219":"s","\u015F":"s","\u023F":"s","\uA7A9":"s","\uA785":"s","\u1E9B":"s","\u24E3":"t","\uFF54":"t","\u1E6B":"t","\u1E97":"t","\u0165":"t","\u1E6D":"t","\u021B":"t","\u0163":"t","\u1E71":"t","\u1E6F":"t","\u0167":"t","\u01AD":"t","\u0288":"t","\u2C66":"t","\uA787":"t","\uA729":"tz","\u24E4":"u","\uFF55":"u","\u00F9":"u","\u00FA":"u","\u00FB":"u","\u0169":"u","\u1E79":"u","\u016B":"u","\u1E7B":"u","\u016D":"u","\u00FC":"u","\u01DC":"u","\u01D8":"u","\u01D6":"u","\u01DA":"u","\u1EE7":"u","\u016F":"u","\u0171":"u","\u01D4":"u","\u0215":"u","\u0217":"u","\u01B0":"u","\u1EEB":"u","\u1EE9":"u","\u1EEF":"u","\u1EED":"u","\u1EF1":"u","\u1EE5":"u","\u1E73":"u","\u0173":"u","\u1E77":"u","\u1E75":"u","\u0289":"u","\u24E5":"v","\uFF56":"v","\u1E7D":"v","\u1E7F":"v","\u028B":"v","\uA75F":"v","\u028C":"v","\uA761":"vy","\u24E6":"w","\uFF57":"w","\u1E81":"w","\u1E83":"w","\u0175":"w","\u1E87":"w","\u1E85":"w","\u1E98":"w","\u1E89":"w","\u2C73":"w","\u24E7":"x","\uFF58":"x","\u1E8B":"x","\u1E8D":"x","\u24E8":"y","\uFF59":"y","\u1EF3":"y","\u00FD":"y","\u0177":"y","\u1EF9":"y","\u0233":"y","\u1E8F":"y","\u00FF":"y","\u1EF7":"y","\u1E99":"y","\u1EF5":"y","\u01B4":"y","\u024F":"y","\u1EFF":"y","\u24E9":"z","\uFF5A":"z","\u017A":"z","\u1E91":"z","\u017C":"z","\u017E":"z","\u1E93":"z","\u1E95":"z","\u01B6":"z","\u0225":"z","\u0240":"z","\u2C6C":"z","\uA763":"z"};

    $document = $(document);

    nextUid=(function() { var counter=1; return function() { return counter++; }; }());


    function reinsertElement(element) {
        var placeholder = $(document.createTextNode(''));

        element.before(placeholder);
        placeholder.before(element);
        placeholder.remove();
    }

    function stripDiacritics(str) {
        // Used 'uni range + named function' from http://jsperf.com/diacritics/18
        function match(a) {
            return DIACRITICS[a] || a;
        }

        return str.replace(/[^\u0000-\u007E]/g, match);
    }

    function indexOf(value, array) {
        var i = 0, l = array.length;
        for (; i < l; i = i + 1) {
            if (equal(value, array[i])) return i;
        }
        return -1;
    }

    function measureScrollbar () {
        var $template = $( MEASURE_SCROLLBAR_TEMPLATE );
        $template.appendTo('body');

        var dim = {
            width: $template.width() - $template[0].clientWidth,
            height: $template.height() - $template[0].clientHeight
        };
        $template.remove();

        return dim;
    }

    /**
     * Compares equality of a and b
     * @param a
     * @param b
     */
    function equal(a, b) {
        if (a === b) return true;
        if (a === undefined || b === undefined) return false;
        if (a === null || b === null) return false;
        // Check whether 'a' or 'b' is a string (primitive or object).
        // The concatenation of an empty string (+'') converts its argument to a string's primitive.
        if (a.constructor === String) return a+'' === b+''; // a+'' - in case 'a' is a String object
        if (b.constructor === String) return b+'' === a+''; // b+'' - in case 'b' is a String object
        return false;
    }

    /**
     * Splits the string into an array of values, trimming each value. An empty array is returned for nulls or empty
     * strings
     * @param string
     * @param separator
     */
    function splitVal(string, separator) {
        var val, i, l;
        if (string === null || string.length < 1) return [];
        val = string.split(separator);
        for (i = 0, l = val.length; i < l; i = i + 1) val[i] = $.trim(val[i]);
        return val;
    }

    function getSideBorderPadding(element) {
        return element.outerWidth(false) - element.width();
    }

    function installKeyUpChangeEvent(element) {
        var key="keyup-change-value";
        element.on("keydown", function () {
            if ($.data(element, key) === undefined) {
                $.data(element, key, element.val());
            }
        });
        element.on("keyup", function () {
            var val= $.data(element, key);
            if (val !== undefined && element.val() !== val) {
                $.removeData(element, key);
                element.trigger("keyup-change");
            }
        });
    }

    $document.on("mousemove", function (e) {
        lastMousePosition.x = e.pageX;
        lastMousePosition.y = e.pageY;
    });

    /**
     * filters mouse events so an event is fired only if the mouse moved.
     *
     * filters out mouse events that occur when mouse is stationary but
     * the elements under the pointer are scrolled.
     */
    function installFilteredMouseMove(element) {
        element.on("mousemove", function (e) {
            var lastpos = lastMousePosition;
            if (lastpos === undefined || lastpos.x !== e.pageX || lastpos.y !== e.pageY) {
                $(e.target).trigger("mousemove-filtered", e);
            }
        });
    }

    /**
     * Debounces a function. Returns a function that calls the original fn function only if no invocations have been made
     * within the last quietMillis milliseconds.
     *
     * @param quietMillis number of milliseconds to wait before invoking fn
     * @param fn function to be debounced
     * @param ctx object to be used as this reference within fn
     * @return debounced version of fn
     */
    function debounce(quietMillis, fn, ctx) {
        ctx = ctx || undefined;
        var timeout;
        return function () {
            var args = arguments;
            window.clearTimeout(timeout);
            timeout = window.setTimeout(function() {
                fn.apply(ctx, args);
            }, quietMillis);
        };
    }

    function installDebouncedScroll(threshold, element) {
        var notify = debounce(threshold, function (e) { element.trigger("scroll-debounced", e);});
        element.on("scroll", function (e) {
            if (indexOf(e.target, element.get()) >= 0) notify(e);
        });
    }

    function focus($el) {
        if ($el[0] === document.activeElement) return;

        /* set the focus in a 0 timeout - that way the focus is set after the processing
            of the current event has finished - which seems like the only reliable way
            to set focus */
        window.setTimeout(function() {
            var el=$el[0], pos=$el.val().length, range;

            $el.focus();

            /* make sure el received focus so we do not error out when trying to manipulate the caret.
                sometimes modals or others listeners may steal it after its set */
            var isVisible = (el.offsetWidth > 0 || el.offsetHeight > 0);
            if (isVisible && el === document.activeElement) {

                /* after the focus is set move the caret to the end, necessary when we val()
                    just before setting focus */
                if(el.setSelectionRange)
                {
                    el.setSelectionRange(pos, pos);
                }
                else if (el.createTextRange) {
                    range = el.createTextRange();
                    range.collapse(false);
                    range.select();
                }
            }
        }, 0);
    }

    function getCursorInfo(el) {
        el = $(el)[0];
        var offset = 0;
        var length = 0;
        if ('selectionStart' in el) {
            offset = el.selectionStart;
            length = el.selectionEnd - offset;
        } else if ('selection' in document) {
            el.focus();
            var sel = document.selection.createRange();
            length = document.selection.createRange().text.length;
            sel.moveStart('character', -el.value.length);
            offset = sel.text.length - length;
        }
        return { offset: offset, length: length };
    }

    function killEvent(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    function killEventImmediately(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function measureTextWidth(e) {
        if (!sizer){
            var style = e[0].currentStyle || window.getComputedStyle(e[0], null);
            sizer = $(document.createElement("div")).css({
                position: "absolute",
                left: "-10000px",
                top: "-10000px",
                display: "none",
                fontSize: style.fontSize,
                fontFamily: style.fontFamily,
                fontStyle: style.fontStyle,
                fontWeight: style.fontWeight,
                letterSpacing: style.letterSpacing,
                textTransform: style.textTransform,
                whiteSpace: "nowrap"
            });
            sizer.attr("class","select2-sizer");
            $("body").append(sizer);
        }
        sizer.text(e.val());
        return sizer.width();
    }

    function syncCssClasses(dest, src, adapter) {
        var classes, replacements = [], adapted;

        classes = dest.attr("class");
        if (classes) {
            classes = '' + classes; // for IE which returns object
            $(classes.split(" ")).each2(function() {
                if (this.indexOf("select2-") === 0) {
                    replacements.push(this);
                }
            });
        }
        classes = src.attr("class");
        if (classes) {
            classes = '' + classes; // for IE which returns object
            $(classes.split(" ")).each2(function() {
                if (this.indexOf("select2-") !== 0) {
                    adapted = adapter(this);
                    if (adapted) {
                        replacements.push(adapted);
                    }
                }
            });
        }
        dest.attr("class", replacements.join(" "));
    }


    function markMatch(text, term, markup, escapeMarkup) {
        var match=stripDiacritics(text.toUpperCase()).indexOf(stripDiacritics(term.toUpperCase())),
            tl=term.length;

        if (match<0) {
            markup.push(escapeMarkup(text));
            return;
        }

        markup.push(escapeMarkup(text.substring(0, match)));
        markup.push("<span class='select2-match'>");
        markup.push(escapeMarkup(text.substring(match, match + tl)));
        markup.push("</span>");
        markup.push(escapeMarkup(text.substring(match + tl, text.length)));
    }

    function defaultEscapeMarkup(markup) {
        var replace_map = {
            '\\': '&#92;',
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            "/": '&#47;'
        };

        return String(markup).replace(/[&<>"'\/\\]/g, function (match) {
            return replace_map[match];
        });
    }

    /**
     * Produces an ajax-based query function
     *
     * @param options object containing configuration parameters
     * @param options.params parameter map for the transport ajax call, can contain such options as cache, jsonpCallback, etc. see $.ajax
     * @param options.transport function that will be used to execute the ajax request. must be compatible with parameters supported by $.ajax
     * @param options.url url for the data
     * @param options.data a function(searchTerm, pageNumber, context) that should return an object containing query string parameters for the above url.
     * @param options.dataType request data type: ajax, jsonp, other datatypes supported by jQuery's $.ajax function or the transport function if specified
     * @param options.quietMillis (optional) milliseconds to wait before making the ajaxRequest, helps debounce the ajax function if invoked too often
     * @param options.results a function(remoteData, pageNumber) that converts data returned form the remote request to the format expected by Select2.
     *      The expected format is an object containing the following keys:
     *      results array of objects that will be used as choices
     *      more (optional) boolean indicating whether there are more results available
     *      Example: {results:[{id:1, text:'Red'},{id:2, text:'Blue'}], more:true}
     */
    function ajax(options) {
        var timeout, // current scheduled but not yet executed request
            handler = null,
            quietMillis = options.quietMillis || 100,
            ajaxUrl = options.url,
            self = this;

        return function (query) {
            window.clearTimeout(timeout);
            timeout = window.setTimeout(function () {
                var data = options.data, // ajax data function
                    url = ajaxUrl, // ajax url string or function
                    transport = options.transport || $.fn.select2.ajaxDefaults.transport,
                    // deprecated - to be removed in 4.0  - use params instead
                    deprecated = {
                        type: options.type || 'GET', // set type of request (GET or POST)
                        cache: options.cache || false,
                        jsonpCallback: options.jsonpCallback||undefined,
                        dataType: options.dataType||"json"
                    },
                    params = $.extend({}, $.fn.select2.ajaxDefaults.params, deprecated);

                data = data ? data.call(self, query.term, query.page, query.context) : null;
                url = (typeof url === 'function') ? url.call(self, query.term, query.page, query.context) : url;

                if (handler && typeof handler.abort === "function") { handler.abort(); }

                if (options.params) {
                    if ($.isFunction(options.params)) {
                        $.extend(params, options.params.call(self));
                    } else {
                        $.extend(params, options.params);
                    }
                }

                $.extend(params, {
                    url: url,
                    dataType: options.dataType,
                    data: data,
                    success: function (data) {
                        // TODO - replace query.page with query so users have access to term, page, etc.
                        var results = options.results(data, query.page);
                        query.callback(results);
                    }
                });
                handler = transport.call(self, params);
            }, quietMillis);
        };
    }

    /**
     * Produces a query function that works with a local array
     *
     * @param options object containing configuration parameters. The options parameter can either be an array or an
     * object.
     *
     * If the array form is used it is assumed that it contains objects with 'id' and 'text' keys.
     *
     * If the object form is used it is assumed that it contains 'data' and 'text' keys. The 'data' key should contain
     * an array of objects that will be used as choices. These objects must contain at least an 'id' key. The 'text'
     * key can either be a String in which case it is expected that each element in the 'data' array has a key with the
     * value of 'text' which will be used to match choices. Alternatively, text can be a function(item) that can extract
     * the text.
     */
    function local(options) {
        var data = options, // data elements
            dataText,
            tmp,
            text = function (item) { return ""+item.text; }; // function used to retrieve the text portion of a data item that is matched against the search

         if ($.isArray(data)) {
            tmp = data;
            data = { results: tmp };
        }

         if ($.isFunction(data) === false) {
            tmp = data;
            data = function() { return tmp; };
        }

        var dataItem = data();
        if (dataItem.text) {
            text = dataItem.text;
            // if text is not a function we assume it to be a key name
            if (!$.isFunction(text)) {
                dataText = dataItem.text; // we need to store this in a separate variable because in the next step data gets reset and data.text is no longer available
                text = function (item) { return item[dataText]; };
            }
        }

        return function (query) {
            var t = query.term, filtered = { results: [] }, process;
            if (t === "") {
                query.callback(data());
                return;
            }

            process = function(datum, collection) {
                var group, attr;
                datum = datum[0];
                if (datum.children) {
                    group = {};
                    for (attr in datum) {
                        if (datum.hasOwnProperty(attr)) group[attr]=datum[attr];
                    }
                    group.children=[];
                    $(datum.children).each2(function(i, childDatum) { process(childDatum, group.children); });
                    if (group.children.length || query.matcher(t, text(group), datum)) {
                        collection.push(group);
                    }
                } else {
                    if (query.matcher(t, text(datum), datum)) {
                        collection.push(datum);
                    }
                }
            };

            $(data().results).each2(function(i, datum) { process(datum, filtered.results); });
            query.callback(filtered);
        };
    }

    // TODO javadoc
    function tags(data) {
        var isFunc = $.isFunction(data);
        return function (query) {
            var t = query.term, filtered = {results: []};
            var result = isFunc ? data(query) : data;
            if ($.isArray(result)) {
                $(result).each(function () {
                    var isObject = this.text !== undefined,
                        text = isObject ? this.text : this;
                    if (t === "" || query.matcher(t, text)) {
                        filtered.results.push(isObject ? this : {id: this, text: this});
                    }
                });
                query.callback(filtered);
            }
        };
    }

    /**
     * Checks if the formatter function should be used.
     *
     * Throws an error if it is not a function. Returns true if it should be used,
     * false if no formatting should be performed.
     *
     * @param formatter
     */
    function checkFormatter(formatter, formatterName) {
        if ($.isFunction(formatter)) return true;
        if (!formatter) return false;
        if (typeof(formatter) === 'string') return true;
        throw new Error(formatterName +" must be a string, function, or falsy value");
    }

    function evaluate(val) {
        if ($.isFunction(val)) {
            var args = Array.prototype.slice.call(arguments, 1);
            return val.apply(null, args);
        }
        return val;
    }

    function countResults(results) {
        var count = 0;
        $.each(results, function(i, item) {
            if (item.children) {
                count += countResults(item.children);
            } else {
                count++;
            }
        });
        return count;
    }

    /**
     * Default tokenizer. This function uses breaks the input on substring match of any string from the
     * opts.tokenSeparators array and uses opts.createSearchChoice to create the choice object. Both of those
     * two options have to be defined in order for the tokenizer to work.
     *
     * @param input text user has typed so far or pasted into the search field
     * @param selection currently selected choices
     * @param selectCallback function(choice) callback tho add the choice to selection
     * @param opts select2's opts
     * @return undefined/null to leave the current input unchanged, or a string to change the input to the returned value
     */
    function defaultTokenizer(input, selection, selectCallback, opts) {
        var original = input, // store the original so we can compare and know if we need to tell the search to update its text
            dupe = false, // check for whether a token we extracted represents a duplicate selected choice
            token, // token
            index, // position at which the separator was found
            i, l, // looping variables
            separator; // the matched separator

        if (!opts.createSearchChoice || !opts.tokenSeparators || opts.tokenSeparators.length < 1) return undefined;

        while (true) {
            index = -1;

            for (i = 0, l = opts.tokenSeparators.length; i < l; i++) {
                separator = opts.tokenSeparators[i];
                index = input.indexOf(separator);
                if (index >= 0) break;
            }

            if (index < 0) break; // did not find any token separator in the input string, bail

            token = input.substring(0, index);
            input = input.substring(index + separator.length);

            if (token.length > 0) {
                token = opts.createSearchChoice.call(this, token, selection);
                if (token !== undefined && token !== null && opts.id(token) !== undefined && opts.id(token) !== null) {
                    dupe = false;
                    for (i = 0, l = selection.length; i < l; i++) {
                        if (equal(opts.id(token), opts.id(selection[i]))) {
                            dupe = true; break;
                        }
                    }

                    if (!dupe) selectCallback(token);
                }
            }
        }

        if (original!==input) return input;
    }

    function cleanupJQueryElements() {
        var self = this;

        Array.prototype.forEach.call(arguments, function (element) {
            self[element].remove();
            self[element] = null;
        });
    }

    /**
     * Creates a new class
     *
     * @param superClass
     * @param methods
     */
    function clazz(SuperClass, methods) {
        var constructor = function () {};
        constructor.prototype = new SuperClass;
        constructor.prototype.constructor = constructor;
        constructor.prototype.parent = SuperClass.prototype;
        constructor.prototype = $.extend(constructor.prototype, methods);
        return constructor;
    }

    AbstractSelect2 = clazz(Object, {

        // abstract
        bind: function (func) {
            var self = this;
            return function () {
                func.apply(self, arguments);
            };
        },

        // abstract
        init: function (opts) {
            var results, search, resultsSelector = ".select2-results";

            // prepare options
            this.opts = opts = this.prepareOpts(opts);

            this.id=opts.id;

            // destroy if called on an existing component
            if (opts.element.data("select2") !== undefined &&
                opts.element.data("select2") !== null) {
                opts.element.data("select2").destroy();
            }

            this.container = this.createContainer();

            this.liveRegion = $("<span>", {
                    role: "status",
                    "aria-live": "polite"
                })
                .addClass("select2-hidden-accessible")
                .appendTo(document.body);

            this.containerId="s2id_"+(opts.element.attr("id") || "autogen"+nextUid());
            this.containerEventName= this.containerId
                .replace(/([.])/g, '_')
                .replace(/([;&,\-\.\+\*\~':"\!\^#$%@\[\]\(\)=>\|])/g, '\\$1');
            this.container.attr("id", this.containerId);

            this.container.attr("title", opts.element.attr("title"));

            this.body = $("body");

            syncCssClasses(this.container, this.opts.element, this.opts.adaptContainerCssClass);

            this.container.attr("style", opts.element.attr("style"));
            this.container.css(evaluate(opts.containerCss));
            this.container.addClass(evaluate(opts.containerCssClass));

            this.elementTabIndex = this.opts.element.attr("tabindex");

            // swap container for the element
            this.opts.element
                .data("select2", this)
                .attr("tabindex", "-1")
                .before(this.container)
                .on("click.select2", killEvent); // do not leak click events

            this.container.data("select2", this);

            this.dropdown = this.container.find(".select2-drop");

            syncCssClasses(this.dropdown, this.opts.element, this.opts.adaptDropdownCssClass);

            this.dropdown.addClass(evaluate(opts.dropdownCssClass));
            this.dropdown.data("select2", this);
            this.dropdown.on("click", killEvent);

            this.results = results = this.container.find(resultsSelector);
            this.search = search = this.container.find("input.select2-input");

            this.queryCount = 0;
            this.resultsPage = 0;
            this.context = null;

            // initialize the container
            this.initContainer();

            this.container.on("click", killEvent);

            installFilteredMouseMove(this.results);

            this.dropdown.on("mousemove-filtered", resultsSelector, this.bind(this.highlightUnderEvent));
            this.dropdown.on("touchstart touchmove touchend", resultsSelector, this.bind(function (event) {
                this._touchEvent = true;
                this.highlightUnderEvent(event);
            }));
            this.dropdown.on("touchmove", resultsSelector, this.bind(this.touchMoved));
            this.dropdown.on("touchstart touchend", resultsSelector, this.bind(this.clearTouchMoved));

            // Waiting for a click event on touch devices to select option and hide dropdown
            // otherwise click will be triggered on an underlying element
            this.dropdown.on('click', this.bind(function (event) {
                if (this._touchEvent) {
                    this._touchEvent = false;
                    this.selectHighlighted();
                }
            }));

            installDebouncedScroll(80, this.results);
            this.dropdown.on("scroll-debounced", resultsSelector, this.bind(this.loadMoreIfNeeded));

            // do not propagate change event from the search field out of the component
            $(this.container).on("change", ".select2-input", function(e) {e.stopPropagation();});
            $(this.dropdown).on("change", ".select2-input", function(e) {e.stopPropagation();});

            // if jquery.mousewheel plugin is installed we can prevent out-of-bounds scrolling of results via mousewheel
            if ($.fn.mousewheel) {
                results.mousewheel(function (e, delta, deltaX, deltaY) {
                    var top = results.scrollTop();
                    if (deltaY > 0 && top - deltaY <= 0) {
                        results.scrollTop(0);
                        killEvent(e);
                    } else if (deltaY < 0 && results.get(0).scrollHeight - results.scrollTop() + deltaY <= results.height()) {
                        results.scrollTop(results.get(0).scrollHeight - results.height());
                        killEvent(e);
                    }
                });
            }

            installKeyUpChangeEvent(search);
            search.on("keyup-change input paste", this.bind(this.updateResults));
            search.on("focus", function () { search.addClass("select2-focused"); });
            search.on("blur", function () { search.removeClass("select2-focused");});

            this.dropdown.on("mouseup", resultsSelector, this.bind(function (e) {
                if ($(e.target).closest(".select2-result-selectable").length > 0) {
                    this.highlightUnderEvent(e);
                    this.selectHighlighted(e);
                }
            }));

            // trap all mouse events from leaving the dropdown. sometimes there may be a modal that is listening
            // for mouse events outside of itself so it can close itself. since the dropdown is now outside the select2's
            // dom it will trigger the popup close, which is not what we want
            // focusin can cause focus wars between modals and select2 since the dropdown is outside the modal.
            this.dropdown.on("click mouseup mousedown touchstart touchend focusin", function (e) { e.stopPropagation(); });

            this.nextSearchTerm = undefined;

            if ($.isFunction(this.opts.initSelection)) {
                // initialize selection based on the current value of the source element
                this.initSelection();

                // if the user has provided a function that can set selection based on the value of the source element
                // we monitor the change event on the element and trigger it, allowing for two way synchronization
                this.monitorSource();
            }

            if (opts.maximumInputLength !== null) {
                this.search.attr("maxlength", opts.maximumInputLength);
            }

            var disabled = opts.element.prop("disabled");
            if (disabled === undefined) disabled = false;
            this.enable(!disabled);

            var readonly = opts.element.prop("readonly");
            if (readonly === undefined) readonly = false;
            this.readonly(readonly);

            // Calculate size of scrollbar
            scrollBarDimensions = scrollBarDimensions || measureScrollbar();

            this.autofocus = opts.element.prop("autofocus");
            opts.element.prop("autofocus", false);
            if (this.autofocus) this.focus();

            this.search.attr("placeholder", opts.searchInputPlaceholder);
        },

        // abstract
        destroy: function () {
            var element=this.opts.element, select2 = element.data("select2");

            this.close();

            if (this.propertyObserver) {
                this.propertyObserver.disconnect();
                this.propertyObserver = null;
            }

            if (select2 !== undefined) {
                select2.container.remove();
                select2.liveRegion.remove();
                select2.dropdown.remove();
                element
                    .removeClass("select2-offscreen")
                    .removeData("select2")
                    .off(".select2")
                    .prop("autofocus", this.autofocus || false);
                if (this.elementTabIndex) {
                    element.attr({tabindex: this.elementTabIndex});
                } else {
                    element.removeAttr("tabindex");
                }
                element.show();
            }

            cleanupJQueryElements.call(this,
                "container",
                "liveRegion",
                "dropdown",
                "results",
                "search"
            );
        },

        // abstract
        optionToData: function(element) {
            if (element.is("option")) {
                return {
                    id:element.prop("value"),
                    text:element.text(),
                    element: element.get(),
                    css: element.attr("class"),
                    disabled: element.prop("disabled"),
                    locked: equal(element.attr("locked"), "locked") || equal(element.data("locked"), true)
                };
            } else if (element.is("optgroup")) {
                return {
                    text:element.attr("label"),
                    children:[],
                    element: element.get(),
                    css: element.attr("class")
                };
            }
        },

        // abstract
        prepareOpts: function (opts) {
            var element, select, idKey, ajaxUrl, self = this;

            element = opts.element;

            if (element.get(0).tagName.toLowerCase() === "select") {
                this.select = select = opts.element;
            }

            if (select) {
                // these options are not allowed when attached to a select because they are picked up off the element itself
                $.each(["id", "multiple", "ajax", "query", "createSearchChoice", "initSelection", "data", "tags"], function () {
                    if (this in opts) {
                        throw new Error("Option '" + this + "' is not allowed for Select2 when attached to a <select> element.");
                    }
                });
            }

            opts = $.extend({}, {
                populateResults: function(container, results, query) {
                    var populate, id=this.opts.id, liveRegion=this.liveRegion;

                    populate=function(results, container, depth) {

                        var i, l, result, selectable, disabled, compound, node, label, innerContainer, formatted;

                        results = opts.sortResults(results, container, query);

                        for (i = 0, l = results.length; i < l; i = i + 1) {

                            result=results[i];

                            disabled = (result.disabled === true);
                            selectable = (!disabled) && (id(result) !== undefined);

                            compound=result.children && result.children.length > 0;

                            node=$("<li></li>");
                            node.addClass("select2-results-dept-"+depth);
                            node.addClass("select2-result");
                            node.addClass(selectable ? "select2-result-selectable" : "select2-result-unselectable");
                            if (disabled) { node.addClass("select2-disabled"); }
                            if (compound) { node.addClass("select2-result-with-children"); }
                            node.addClass(self.opts.formatResultCssClass(result));
                            node.attr("role", "presentation");

                            label=$(document.createElement("div"));
                            label.addClass("select2-result-label");
                            label.attr("id", "select2-result-label-" + nextUid());
                            label.attr("role", "option");

                            formatted=opts.formatResult(result, label, query, self.opts.escapeMarkup);
                            if (formatted!==undefined) {
                                label.html(formatted);
                                node.append(label);
                            }


                            if (compound) {

                                innerContainer=$("<ul></ul>");
                                innerContainer.addClass("select2-result-sub");
                                populate(result.children, innerContainer, depth+1);
                                node.append(innerContainer);
                            }

                            node.data("select2-data", result);
                            container.append(node);
                        }

                        liveRegion.text(opts.formatMatches(results.length));
                    };

                    populate(results, container, 0);
                }
            }, $.fn.select2.defaults, opts);

            if (typeof(opts.id) !== "function") {
                idKey = opts.id;
                opts.id = function (e) { return e[idKey]; };
            }

            if ($.isArray(opts.element.data("select2Tags"))) {
                if ("tags" in opts) {
                    throw "tags specified as both an attribute 'data-select2-tags' and in options of Select2 " + opts.element.attr("id");
                }
                opts.tags=opts.element.data("select2Tags");
            }

            if (select) {
                opts.query = this.bind(function (query) {
                    var data = { results: [], more: false },
                        term = query.term,
                        children, placeholderOption, process;

                    process=function(element, collection) {
                        var group;
                        if (element.is("option")) {
                            if (query.matcher(term, element.text(), element)) {
                                collection.push(self.optionToData(element));
                            }
                        } else if (element.is("optgroup")) {
                            group=self.optionToData(element);
                            element.children().each2(function(i, elm) { process(elm, group.children); });
                            if (group.children.length>0) {
                                collection.push(group);
                            }
                        }
                    };

                    children=element.children();

                    // ignore the placeholder option if there is one
                    if (this.getPlaceholder() !== undefined && children.length > 0) {
                        placeholderOption = this.getPlaceholderOption();
                        if (placeholderOption) {
                            children=children.not(placeholderOption);
                        }
                    }

                    children.each2(function(i, elm) { process(elm, data.results); });

                    query.callback(data);
                });
                // this is needed because inside val() we construct choices from options and there id is hardcoded
                opts.id=function(e) { return e.id; };
            } else {
                if (!("query" in opts)) {

                    if ("ajax" in opts) {
                        ajaxUrl = opts.element.data("ajax-url");
                        if (ajaxUrl && ajaxUrl.length > 0) {
                            opts.ajax.url = ajaxUrl;
                        }
                        opts.query = ajax.call(opts.element, opts.ajax);
                    } else if ("data" in opts) {
                        opts.query = local(opts.data);
                    } else if ("tags" in opts) {
                        opts.query = tags(opts.tags);
                        if (opts.createSearchChoice === undefined) {
                            opts.createSearchChoice = function (term) { return {id: $.trim(term), text: $.trim(term)}; };
                        }
                        if (opts.initSelection === undefined) {
                            opts.initSelection = function (element, callback) {
                                var data = [];
                                $(splitVal(element.val(), opts.separator)).each(function () {
                                    var obj = { id: this, text: this },
                                        tags = opts.tags;
                                    if ($.isFunction(tags)) tags=tags();
                                    $(tags).each(function() { if (equal(this.id, obj.id)) { obj = this; return false; } });
                                    data.push(obj);
                                });

                                callback(data);
                            };
                        }
                    }
                }
            }
            if (typeof(opts.query) !== "function") {
                throw "query function not defined for Select2 " + opts.element.attr("id");
            }

            if (opts.createSearchChoicePosition === 'top') {
                opts.createSearchChoicePosition = function(list, item) { list.unshift(item); };
            }
            else if (opts.createSearchChoicePosition === 'bottom') {
                opts.createSearchChoicePosition = function(list, item) { list.push(item); };
            }
            else if (typeof(opts.createSearchChoicePosition) !== "function")  {
                throw "invalid createSearchChoicePosition option must be 'top', 'bottom' or a custom function";
            }

            return opts;
        },

        /**
         * Monitor the original element for changes and update select2 accordingly
         */
        // abstract
        monitorSource: function () {
            var el = this.opts.element, sync, observer;

            el.on("change.select2", this.bind(function (e) {
                if (this.opts.element.data("select2-change-triggered") !== true) {
                    this.initSelection();
                }
            }));

            sync = this.bind(function () {

                // sync enabled state
                var disabled = el.prop("disabled");
                if (disabled === undefined) disabled = false;
                this.enable(!disabled);

                var readonly = el.prop("readonly");
                if (readonly === undefined) readonly = false;
                this.readonly(readonly);

                syncCssClasses(this.container, this.opts.element, this.opts.adaptContainerCssClass);
                this.container.addClass(evaluate(this.opts.containerCssClass));

                syncCssClasses(this.dropdown, this.opts.element, this.opts.adaptDropdownCssClass);
                this.dropdown.addClass(evaluate(this.opts.dropdownCssClass));

            });

            // IE8-10 (IE9/10 won't fire propertyChange via attachEventListener)
            if (el.length && el[0].attachEvent) {
                el.each(function() {
                    this.attachEvent("onpropertychange", sync);
                });
            }
            
            // safari, chrome, firefox, IE11
            observer = window.MutationObserver || window.WebKitMutationObserver|| window.MozMutationObserver;
            if (observer !== undefined) {
                if (this.propertyObserver) { delete this.propertyObserver; this.propertyObserver = null; }
                this.propertyObserver = new observer(function (mutations) {
                    mutations.forEach(sync);
                });
                this.propertyObserver.observe(el.get(0), { attributes:true, subtree:false });
            }
        },

        // abstract
        triggerSelect: function(data) {
            var evt = $.Event("select2-selecting", { val: this.id(data), object: data });
            this.opts.element.trigger(evt);
            return !evt.isDefaultPrevented();
        },

        /**
         * Triggers the change event on the source element
         */
        // abstract
        triggerChange: function (details) {

            details = details || {};
            details= $.extend({}, details, { type: "change", val: this.val() });
            // prevents recursive triggering
            this.opts.element.data("select2-change-triggered", true);
            this.opts.element.trigger(details);
            this.opts.element.data("select2-change-triggered", false);

            // some validation frameworks ignore the change event and listen instead to keyup, click for selects
            // so here we trigger the click event manually
            this.opts.element.click();

            // ValidationEngine ignores the change event and listens instead to blur
            // so here we trigger the blur event manually if so desired
            if (this.opts.blurOnChange)
                this.opts.element.blur();
        },

        //abstract
        isInterfaceEnabled: function()
        {
            return this.enabledInterface === true;
        },

        // abstract
        enableInterface: function() {
            var enabled = this._enabled && !this._readonly,
                disabled = !enabled;

            if (enabled === this.enabledInterface) return false;

            this.container.toggleClass("select2-container-disabled", disabled);
            this.close();
            this.enabledInterface = enabled;

            return true;
        },

        // abstract
        enable: function(enabled) {
            if (enabled === undefined) enabled = true;
            if (this._enabled === enabled) return;
            this._enabled = enabled;

            this.opts.element.prop("disabled", !enabled);
            this.enableInterface();
        },

        // abstract
        disable: function() {
            this.enable(false);
        },

        // abstract
        readonly: function(enabled) {
            if (enabled === undefined) enabled = false;
            if (this._readonly === enabled) return;
            this._readonly = enabled;

            this.opts.element.prop("readonly", enabled);
            this.enableInterface();
        },

        // abstract
        opened: function () {
            return this.container.hasClass("select2-dropdown-open");
        },

        // abstract
        positionDropdown: function() {
            var $dropdown = this.dropdown,
                offset = this.container.offset(),
                height = this.container.outerHeight(false),
                width = this.container.outerWidth(false),
                dropHeight = $dropdown.outerHeight(false),
                $window = $(window),
                windowWidth = $window.width(),
                windowHeight = $window.height(),
                viewPortRight = $window.scrollLeft() + windowWidth,
                viewportBottom = $window.scrollTop() + windowHeight,
                dropTop = offset.top + height,
                dropLeft = offset.left,
                enoughRoomBelow = dropTop + dropHeight <= viewportBottom,
                enoughRoomAbove = (offset.top - dropHeight) >= $window.scrollTop(),
                dropWidth = $dropdown.outerWidth(false),
                enoughRoomOnRight = dropLeft + dropWidth <= viewPortRight,
                aboveNow = $dropdown.hasClass("select2-drop-above"),
                bodyOffset,
                above,
                changeDirection,
                css,
                resultsListNode;

            // always prefer the current above/below alignment, unless there is not enough room
            if (aboveNow) {
                above = true;
                if (!enoughRoomAbove && enoughRoomBelow) {
                    changeDirection = true;
                    above = false;
                }
            } else {
                above = false;
                if (!enoughRoomBelow && enoughRoomAbove) {
                    changeDirection = true;
                    above = true;
                }
            }

            //if we are changing direction we need to get positions when dropdown is hidden;
            if (changeDirection) {
                $dropdown.hide();
                offset = this.container.offset();
                height = this.container.outerHeight(false);
                width = this.container.outerWidth(false);
                dropHeight = $dropdown.outerHeight(false);
                viewPortRight = $window.scrollLeft() + windowWidth;
                viewportBottom = $window.scrollTop() + windowHeight;
                dropTop = offset.top + height;
                dropLeft = offset.left;
                dropWidth = $dropdown.outerWidth(false);
                enoughRoomOnRight = dropLeft + dropWidth <= viewPortRight;
                $dropdown.show();

                // fix so the cursor does not move to the left within the search-textbox in IE
                this.focusSearch();
            }

            if (this.opts.dropdownAutoWidth) {
                resultsListNode = $('.select2-results', $dropdown)[0];
                $dropdown.addClass('select2-drop-auto-width');
                $dropdown.css('width', '');
                // Add scrollbar width to dropdown if vertical scrollbar is present
                dropWidth = $dropdown.outerWidth(false) + (resultsListNode.scrollHeight === resultsListNode.clientHeight ? 0 : scrollBarDimensions.width);
                dropWidth > width ? width = dropWidth : dropWidth = width;
                dropHeight = $dropdown.outerHeight(false);
                enoughRoomOnRight = dropLeft + dropWidth <= viewPortRight;
            }
            else {
                this.container.removeClass('select2-drop-auto-width');
            }

            //console.log("below/ droptop:", dropTop, "dropHeight", dropHeight, "sum", (dropTop+dropHeight)+" viewport bottom", viewportBottom, "enough?", enoughRoomBelow);
            //console.log("above/ offset.top", offset.top, "dropHeight", dropHeight, "top", (offset.top-dropHeight), "scrollTop", this.body.scrollTop(), "enough?", enoughRoomAbove);

            // fix positioning when body has an offset and is not position: static
            if (this.body.css('position') !== 'static') {
                bodyOffset = this.body.offset();
                dropTop -= bodyOffset.top;
                dropLeft -= bodyOffset.left;
            }

            if (!enoughRoomOnRight) {
                dropLeft = offset.left + this.container.outerWidth(false) - dropWidth;
            }

            css =  {
                left: dropLeft,
                width: width
            };

            if (above) {
                css.top = offset.top - dropHeight;
                css.bottom = 'auto';
                this.container.addClass("select2-drop-above");
                $dropdown.addClass("select2-drop-above");
            }
            else {
                css.top = dropTop;
                css.bottom = 'auto';
                this.container.removeClass("select2-drop-above");
                $dropdown.removeClass("select2-drop-above");
            }
            css = $.extend(css, evaluate(this.opts.dropdownCss));

            $dropdown.css(css);
        },

        // abstract
        shouldOpen: function() {
            var event;

            if (this.opened()) return false;

            if (this._enabled === false || this._readonly === true) return false;

            event = $.Event("select2-opening");
            this.opts.element.trigger(event);
            return !event.isDefaultPrevented();
        },

        // abstract
        clearDropdownAlignmentPreference: function() {
            // clear the classes used to figure out the preference of where the dropdown should be opened
            this.container.removeClass("select2-drop-above");
            this.dropdown.removeClass("select2-drop-above");
        },

        /**
         * Opens the dropdown
         *
         * @return {Boolean} whether or not dropdown was opened. This method will return false if, for example,
         * the dropdown is already open, or if the 'open' event listener on the element called preventDefault().
         */
        // abstract
        open: function () {

            if (!this.shouldOpen()) return false;

            this.opening();

            return true;
        },

        /**
         * Performs the opening of the dropdown
         */
        // abstract
        opening: function() {
            var cid = this.containerEventName,
                scroll = "scroll." + cid,
                resize = "resize."+cid,
                orient = "orientationchange."+cid,
                mask;

            this.container.addClass("select2-dropdown-open").addClass("select2-container-active");

            this.clearDropdownAlignmentPreference();

            if(this.dropdown[0] !== this.body.children().last()[0]) {
                this.dropdown.detach().appendTo(this.body);
            }

            // create the dropdown mask if doesn't already exist
            mask = $("#select2-drop-mask");
            if (mask.length == 0) {
                mask = $(document.createElement("div"));
                mask.attr("id","select2-drop-mask").attr("class","select2-drop-mask");
                mask.hide();
                mask.appendTo(this.body);
                mask.on("mousedown touchstart click", function (e) {
                    // Prevent IE from generating a click event on the body
                    reinsertElement(mask);

                    var dropdown = $("#select2-drop"), self;
                    if (dropdown.length > 0) {
                        self=dropdown.data("select2");
                        if (self.opts.selectOnBlur) {
                            self.selectHighlighted({noFocus: true});
                        }
                        self.close();
                        e.preventDefault();
                        e.stopPropagation();
                    }
                });
            }

            // ensure the mask is always right before the dropdown
            if (this.dropdown.prev()[0] !== mask[0]) {
                this.dropdown.before(mask);
            }

            // move the global id to the correct dropdown
            $("#select2-drop").removeAttr("id");
            this.dropdown.attr("id", "select2-drop");

            // show the elements
            mask.show();

            this.positionDropdown();
            this.dropdown.show();
            this.positionDropdown();

            this.dropdown.addClass("select2-drop-active");

            // attach listeners to events that can change the position of the container and thus require
            // the position of the dropdown to be updated as well so it does not come unglued from the container
            var that = this;
            this.container.parents().add(window).each(function () {
                $(this).on(resize+" "+scroll+" "+orient, function (e) {
                    if (that.opened()) that.positionDropdown();
                });
            });


        },

        // abstract
        close: function () {
            if (!this.opened()) return;

            var cid = this.containerEventName,
                scroll = "scroll." + cid,
                resize = "resize."+cid,
                orient = "orientationchange."+cid;

            // unbind event listeners
            this.container.parents().add(window).each(function () { $(this).off(scroll).off(resize).off(orient); });

            this.clearDropdownAlignmentPreference();

            $("#select2-drop-mask").hide();
            this.dropdown.removeAttr("id"); // only the active dropdown has the select2-drop id
            this.dropdown.hide();
            this.container.removeClass("select2-dropdown-open").removeClass("select2-container-active");
            this.results.empty();


            this.clearSearch();
            this.search.removeClass("select2-active");
            this.opts.element.trigger($.Event("select2-close"));
        },

        /**
         * Opens control, sets input value, and updates results.
         */
        // abstract
        externalSearch: function (term) {
            this.open();
            this.search.val(term);
            this.updateResults(false);
        },

        // abstract
        clearSearch: function () {

        },

        //abstract
        getMaximumSelectionSize: function() {
            return evaluate(this.opts.maximumSelectionSize);
        },

        // abstract
        ensureHighlightVisible: function () {
            var results = this.results, children, index, child, hb, rb, y, more;

            index = this.highlight();

            if (index < 0) return;

            if (index == 0) {

                // if the first element is highlighted scroll all the way to the top,
                // that way any unselectable headers above it will also be scrolled
                // into view

                results.scrollTop(0);
                return;
            }

            children = this.findHighlightableChoices().find('.select2-result-label');

            child = $(children[index]);

            hb = child.offset().top + child.outerHeight(true);

            // if this is the last child lets also make sure select2-more-results is visible
            if (index === children.length - 1) {
                more = results.find("li.select2-more-results");
                if (more.length > 0) {
                    hb = more.offset().top + more.outerHeight(true);
                }
            }

            rb = results.offset().top + results.outerHeight(true);
            if (hb > rb) {
                results.scrollTop(results.scrollTop() + (hb - rb));
            }
            y = child.offset().top - results.offset().top;

            // make sure the top of the element is visible
            if (y < 0 && child.css('display') != 'none' ) {
                results.scrollTop(results.scrollTop() + y); // y is negative
            }
        },

        // abstract
        findHighlightableChoices: function() {
            return this.results.find(".select2-result-selectable:not(.select2-disabled):not(.select2-selected)");
        },

        // abstract
        moveHighlight: function (delta) {
            var choices = this.findHighlightableChoices(),
                index = this.highlight();

            while (index > -1 && index < choices.length) {
                index += delta;
                var choice = $(choices[index]);
                if (choice.hasClass("select2-result-selectable") && !choice.hasClass("select2-disabled") && !choice.hasClass("select2-selected")) {
                    this.highlight(index);
                    break;
                }
            }
        },

        // abstract
        highlight: function (index) {
            var choices = this.findHighlightableChoices(),
                choice,
                data;

            if (arguments.length === 0) {
                return indexOf(choices.filter(".select2-highlighted")[0], choices.get());
            }

            if (index >= choices.length) index = choices.length - 1;
            if (index < 0) index = 0;

            this.removeHighlight();

            choice = $(choices[index]);
            choice.addClass("select2-highlighted");

            // ensure assistive technology can determine the active choice
            this.search.attr("aria-activedescendant", choice.find(".select2-result-label").attr("id"));

            this.ensureHighlightVisible();

            this.liveRegion.text(choice.text());

            data = choice.data("select2-data");
            if (data) {
                this.opts.element.trigger({ type: "select2-highlight", val: this.id(data), choice: data });
            }
        },

        removeHighlight: function() {
            this.results.find(".select2-highlighted").removeClass("select2-highlighted");
        },

        touchMoved: function() {
            this._touchMoved = true;
        },

        clearTouchMoved: function() {
          this._touchMoved = false;
        },

        // abstract
        countSelectableResults: function() {
            return this.findHighlightableChoices().length;
        },

        // abstract
        highlightUnderEvent: function (event) {
            var el = $(event.target).closest(".select2-result-selectable");
            if (el.length > 0 && !el.is(".select2-highlighted")) {
                var choices = this.findHighlightableChoices();
                this.highlight(choices.index(el));
            } else if (el.length == 0) {
                // if we are over an unselectable item remove all highlights
                this.removeHighlight();
            }
        },

        // abstract
        loadMoreIfNeeded: function () {
            var results = this.results,
                more = results.find("li.select2-more-results"),
                below, // pixels the element is below the scroll fold, below==0 is when the element is starting to be visible
                page = this.resultsPage + 1,
                self=this,
                term=this.search.val(),
                context=this.context;

            if (more.length === 0) return;
            below = more.offset().top - results.offset().top - results.height();

            if (below <= this.opts.loadMorePadding) {
                more.addClass("select2-active");
                this.opts.query({
                        element: this.opts.element,
                        term: term,
                        page: page,
                        context: context,
                        matcher: this.opts.matcher,
                        callback: this.bind(function (data) {

                    // ignore a response if the select2 has been closed before it was received
                    if (!self.opened()) return;


                    self.opts.populateResults.call(this, results, data.results, {term: term, page: page, context:context});
                    self.postprocessResults(data, false, false);

                    if (data.more===true) {
                        more.detach().appendTo(results).text(evaluate(self.opts.formatLoadMore, page+1));
                        window.setTimeout(function() { self.loadMoreIfNeeded(); }, 10);
                    } else {
                        more.remove();
                    }
                    self.positionDropdown();
                    self.resultsPage = page;
                    self.context = data.context;
                    this.opts.element.trigger({ type: "select2-loaded", items: data });
                })});
            }
        },

        /**
         * Default tokenizer function which does nothing
         */
        tokenize: function() {

        },

        /**
         * @param initial whether or not this is the call to this method right after the dropdown has been opened
         */
        // abstract
        updateResults: function (initial) {
            var search = this.search,
                results = this.results,
                opts = this.opts,
                data,
                self = this,
                input,
                term = search.val(),
                lastTerm = $.data(this.container, "select2-last-term"),
                // sequence number used to drop out-of-order responses
                queryNumber;

            // prevent duplicate queries against the same term
            if (initial !== true && lastTerm && equal(term, lastTerm)) return;

            $.data(this.container, "select2-last-term", term);

            // if the search is currently hidden we do not alter the results
            if (initial !== true && (this.showSearchInput === false || !this.opened())) {
                return;
            }

            function postRender() {
                search.removeClass("select2-active");
                self.positionDropdown();
                if (results.find('.select2-no-results,.select2-selection-limit,.select2-searching').length) {
                    self.liveRegion.text(results.text());
                }
                else {
                    self.liveRegion.text(self.opts.formatMatches(results.find('.select2-result-selectable').length));
                }
            }

            function render(html) {
                results.html(html);
                postRender();
            }

            queryNumber = ++this.queryCount;

            var maxSelSize = this.getMaximumSelectionSize();
            if (maxSelSize >=1) {
                data = this.data();
                if ($.isArray(data) && data.length >= maxSelSize && checkFormatter(opts.formatSelectionTooBig, "formatSelectionTooBig")) {
                    render("<li class='select2-selection-limit'>" + evaluate(opts.formatSelectionTooBig, maxSelSize) + "</li>");
                    return;
                }
            }

            if (search.val().length < opts.minimumInputLength) {
                if (checkFormatter(opts.formatInputTooShort, "formatInputTooShort")) {
                    render("<li class='select2-no-results'>" + evaluate(opts.formatInputTooShort, search.val(), opts.minimumInputLength) + "</li>");
                } else {
                    render("");
                }
                if (initial && this.showSearch) this.showSearch(true);
                return;
            }

            if (opts.maximumInputLength && search.val().length > opts.maximumInputLength) {
                if (checkFormatter(opts.formatInputTooLong, "formatInputTooLong")) {
                    render("<li class='select2-no-results'>" + evaluate(opts.formatInputTooLong, search.val(), opts.maximumInputLength) + "</li>");
                } else {
                    render("");
                }
                return;
            }

            if (opts.formatSearching && this.findHighlightableChoices().length === 0) {
                render("<li class='select2-searching'>" + evaluate(opts.formatSearching) + "</li>");
            }

            search.addClass("select2-active");

            this.removeHighlight();

            // give the tokenizer a chance to pre-process the input
            input = this.tokenize();
            if (input != undefined && input != null) {
                search.val(input);
            }

            this.resultsPage = 1;

            opts.query({
                element: opts.element,
                    term: search.val(),
                    page: this.resultsPage,
                    context: null,
                    matcher: opts.matcher,
                    callback: this.bind(function (data) {
                var def; // default choice

                // ignore old responses
                if (queryNumber != this.queryCount) {
                  return;
                }

                // ignore a response if the select2 has been closed before it was received
                if (!this.opened()) {
                    this.search.removeClass("select2-active");
                    return;
                }

                // save context, if any
                this.context = (data.context===undefined) ? null : data.context;
                // create a default choice and prepend it to the list
                if (this.opts.createSearchChoice && search.val() !== "") {
                    def = this.opts.createSearchChoice.call(self, search.val(), data.results);
                    if (def !== undefined && def !== null && self.id(def) !== undefined && self.id(def) !== null) {
                        if ($(data.results).filter(
                            function () {
                                return equal(self.id(this), self.id(def));
                            }).length === 0) {
                            this.opts.createSearchChoicePosition(data.results, def);
                        }
                    }
                }

                if (data.results.length === 0 && checkFormatter(opts.formatNoMatches, "formatNoMatches")) {
                    render("<li class='select2-no-results'>" + evaluate(opts.formatNoMatches, search.val()) + "</li>");
                    return;
                }

                results.empty();
                self.opts.populateResults.call(this, results, data.results, {term: search.val(), page: this.resultsPage, context:null});

                if (data.more === true && checkFormatter(opts.formatLoadMore, "formatLoadMore")) {
                    results.append("<li class='select2-more-results'>" + self.opts.escapeMarkup(evaluate(opts.formatLoadMore, this.resultsPage)) + "</li>");
                    window.setTimeout(function() { self.loadMoreIfNeeded(); }, 10);
                }

                this.postprocessResults(data, initial);

                postRender();

                this.opts.element.trigger({ type: "select2-loaded", items: data });
            })});
        },

        // abstract
        cancel: function () {
            this.close();
        },

        // abstract
        blur: function () {
            // if selectOnBlur == true, select the currently highlighted option
            if (this.opts.selectOnBlur)
                this.selectHighlighted({noFocus: true});

            this.close();
            this.container.removeClass("select2-container-active");
            // synonymous to .is(':focus'), which is available in jquery >= 1.6
            if (this.search[0] === document.activeElement) { this.search.blur(); }
            this.clearSearch();
            this.selection.find(".select2-search-choice-focus").removeClass("select2-search-choice-focus");
        },

        // abstract
        focusSearch: function () {
            focus(this.search);
        },

        // abstract
        selectHighlighted: function (options) {
            if (this._touchMoved) {
              this.clearTouchMoved();
              return;
            }
            var index=this.highlight(),
                highlighted=this.results.find(".select2-highlighted"),
                data = highlighted.closest('.select2-result').data("select2-data");

            if (data) {
                this.highlight(index);
                this.onSelect(data, options);
            } else if (options && options.noFocus) {
                this.close();
            }
        },

        // abstract
        getPlaceholder: function () {
            var placeholderOption;
            return this.opts.element.attr("placeholder") ||
                this.opts.element.attr("data-placeholder") || // jquery 1.4 compat
                this.opts.element.data("placeholder") ||
                this.opts.placeholder ||
                ((placeholderOption = this.getPlaceholderOption()) !== undefined ? placeholderOption.text() : undefined);
        },

        // abstract
        getPlaceholderOption: function() {
            if (this.select) {
                var firstOption = this.select.children('option').first();
                if (this.opts.placeholderOption !== undefined ) {
                    //Determine the placeholder option based on the specified placeholderOption setting
                    return (this.opts.placeholderOption === "first" && firstOption) ||
                           (typeof this.opts.placeholderOption === "function" && this.opts.placeholderOption(this.select));
                } else if ($.trim(firstOption.text()) === "" && firstOption.val() === "") {
                    //No explicit placeholder option specified, use the first if it's blank
                    return firstOption;
                }
            }
        },

        /**
         * Get the desired width for the container element.  This is
         * derived first from option `width` passed to select2, then
         * the inline 'style' on the original element, and finally
         * falls back to the jQuery calculated element width.
         */
        // abstract
        initContainerWidth: function () {
            function resolveContainerWidth() {
                var style, attrs, matches, i, l, attr;

                if (this.opts.width === "off") {
                    return null;
                } else if (this.opts.width === "element"){
                    return this.opts.element.outerWidth(false) === 0 ? 'auto' : this.opts.element.outerWidth(false) + 'px';
                } else if (this.opts.width === "copy" || this.opts.width === "resolve") {
                    // check if there is inline style on the element that contains width
                    style = this.opts.element.attr('style');
                    if (style !== undefined) {
                        attrs = style.split(';');
                        for (i = 0, l = attrs.length; i < l; i = i + 1) {
                            attr = attrs[i].replace(/\s/g, '');
                            matches = attr.match(/^width:(([-+]?([0-9]*\.)?[0-9]+)(px|em|ex|%|in|cm|mm|pt|pc))/i);
                            if (matches !== null && matches.length >= 1)
                                return matches[1];
                        }
                    }

                    if (this.opts.width === "resolve") {
                        // next check if css('width') can resolve a width that is percent based, this is sometimes possible
                        // when attached to input type=hidden or elements hidden via css
                        style = this.opts.element.css('width');
                        if (style.indexOf("%") > 0) return style;

                        // finally, fallback on the calculated width of the element
                        return (this.opts.element.outerWidth(false) === 0 ? 'auto' : this.opts.element.outerWidth(false) + 'px');
                    }

                    return null;
                } else if ($.isFunction(this.opts.width)) {
                    return this.opts.width();
                } else {
                    return this.opts.width;
               }
            };

            var width = resolveContainerWidth.call(this);
            if (width !== null) {
                this.container.css("width", width);
            }
        }
    });

    SingleSelect2 = clazz(AbstractSelect2, {

        // single

        createContainer: function () {
            var container = $(document.createElement("div")).attr({
                "class": "select2-container"
            }).html([
                "<a href='javascript:void(0)' class='select2-choice' tabindex='-1'>",
                "   <span class='select2-chosen'>&#160;</span><abbr class='select2-search-choice-close'></abbr>",
                "   <span class='select2-arrow' role='presentation'><b role='presentation'></b></span>",
                "</a>",
                "<label for='' class='select2-offscreen'></label>",
                "<input class='select2-focusser select2-offscreen' type='text' aria-haspopup='true' role='button' />",
                "<div class='select2-drop select2-display-none'>",
                "   <div class='select2-search'>",
                "       <label for='' class='select2-offscreen'></label>",
                "       <input type='text' autocomplete='off' autocorrect='off' autocapitalize='off' spellcheck='false' class='select2-input' role='combobox' aria-expanded='true'",
                "       aria-autocomplete='list' />",
                "   </div>",
                "   <ul class='select2-results' role='listbox'>",
                "   </ul>",
                "</div>"].join(""));
            return container;
        },

        // single
        enableInterface: function() {
            if (this.parent.enableInterface.apply(this, arguments)) {
                this.focusser.prop("disabled", !this.isInterfaceEnabled());
            }
        },

        // single
        opening: function () {
            var el, range, len;

            if (this.opts.minimumResultsForSearch >= 0) {
                this.showSearch(true);
            }

            this.parent.opening.apply(this, arguments);

            if (this.showSearchInput !== false) {
                // IE appends focusser.val() at the end of field :/ so we manually insert it at the beginning using a range
                // all other browsers handle this just fine

                this.search.val(this.focusser.val());
            }
            if (this.opts.shouldFocusInput(this)) {
                this.search.focus();
                // move the cursor to the end after focussing, otherwise it will be at the beginning and
                // new text will appear *before* focusser.val()
                el = this.search.get(0);
                if (el.createTextRange) {
                    range = el.createTextRange();
                    range.collapse(false);
                    range.select();
                } else if (el.setSelectionRange) {
                    len = this.search.val().length;
                    el.setSelectionRange(len, len);
                }
            }

            // initializes search's value with nextSearchTerm (if defined by user)
            // ignore nextSearchTerm if the dropdown is opened by the user pressing a letter
            if(this.search.val() === "") {
                if(this.nextSearchTerm != undefined){
                    this.search.val(this.nextSearchTerm);
                    this.search.select();
                }
            }

            this.focusser.prop("disabled", true).val("");
            this.updateResults(true);
            this.opts.element.trigger($.Event("select2-open"));
        },

        // single
        close: function () {
            if (!this.opened()) return;
            this.parent.close.apply(this, arguments);

            this.focusser.prop("disabled", false);

            if (this.opts.shouldFocusInput(this)) {
                this.focusser.focus();
            }
        },

        // single
        focus: function () {
            if (this.opened()) {
                this.close();
            } else {
                this.focusser.prop("disabled", false);
                if (this.opts.shouldFocusInput(this)) {
                    this.focusser.focus();
                }
            }
        },

        // single
        isFocused: function () {
            return this.container.hasClass("select2-container-active");
        },

        // single
        cancel: function () {
            this.parent.cancel.apply(this, arguments);
            this.focusser.prop("disabled", false);

            if (this.opts.shouldFocusInput(this)) {
                this.focusser.focus();
            }
        },

        // single
        destroy: function() {
            $("label[for='" + this.focusser.attr('id') + "']")
                .attr('for', this.opts.element.attr("id"));
            this.parent.destroy.apply(this, arguments);

            cleanupJQueryElements.call(this,
                "selection",
                "focusser"
            );
        },

        // single
        initContainer: function () {

            var selection,
                container = this.container,
                dropdown = this.dropdown,
                idSuffix = nextUid(),
                elementLabel;

            if (this.opts.minimumResultsForSearch < 0) {
                this.showSearch(false);
            } else {
                this.showSearch(true);
            }

            this.selection = selection = container.find(".select2-choice");

            this.focusser = container.find(".select2-focusser");

            // add aria associations
            selection.find(".select2-chosen").attr("id", "select2-chosen-"+idSuffix);
            this.focusser.attr("aria-labelledby", "select2-chosen-"+idSuffix);
            this.results.attr("id", "select2-results-"+idSuffix);
            this.search.attr("aria-owns", "select2-results-"+idSuffix);

            // rewrite labels from original element to focusser
            this.focusser.attr("id", "s2id_autogen"+idSuffix);

            elementLabel = $("label[for='" + this.opts.element.attr("id") + "']");

            this.focusser.prev()
                .text(elementLabel.text())
                .attr('for', this.focusser.attr('id'));

            // Ensure the original element retains an accessible name
            var originalTitle = this.opts.element.attr("title");
            this.opts.element.attr("title", (originalTitle || elementLabel.text()));

            this.focusser.attr("tabindex", this.elementTabIndex);

            // write label for search field using the label from the focusser element
            this.search.attr("id", this.focusser.attr('id') + '_search');

            this.search.prev()
                .text($("label[for='" + this.focusser.attr('id') + "']").text())
                .attr('for', this.search.attr('id'));

            this.search.on("keydown", this.bind(function (e) {
                if (!this.isInterfaceEnabled()) return;

                if (e.which === KEY.PAGE_UP || e.which === KEY.PAGE_DOWN) {
                    // prevent the page from scrolling
                    killEvent(e);
                    return;
                }

                switch (e.which) {
                    case KEY.UP:
                    case KEY.DOWN:
                        this.moveHighlight((e.which === KEY.UP) ? -1 : 1);
                        killEvent(e);
                        return;
                    case KEY.ENTER:
                        this.selectHighlighted();
                        killEvent(e);
                        return;
                    case KEY.TAB:
                        this.selectHighlighted({noFocus: true});
                        return;
                    case KEY.ESC:
                        this.cancel(e);
                        killEvent(e);
                        return;
                }
            }));

            this.search.on("blur", this.bind(function(e) {
                // a workaround for chrome to keep the search field focussed when the scroll bar is used to scroll the dropdown.
                // without this the search field loses focus which is annoying
                if (document.activeElement === this.body.get(0)) {
                    window.setTimeout(this.bind(function() {
                        if (this.opened()) {
                            this.search.focus();
                        }
                    }), 0);
                }
            }));

            this.focusser.on("keydown", this.bind(function (e) {
                if (!this.isInterfaceEnabled()) return;

                if (e.which === KEY.TAB || KEY.isControl(e) || KEY.isFunctionKey(e) || e.which === KEY.ESC) {
                    return;
                }

                if (this.opts.openOnEnter === false && e.which === KEY.ENTER) {
                    killEvent(e);
                    return;
                }

                if (e.which == KEY.DOWN || e.which == KEY.UP
                    || (e.which == KEY.ENTER && this.opts.openOnEnter)) {

                    if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;

                    this.open();
                    killEvent(e);
                    return;
                }

                if (e.which == KEY.DELETE || e.which == KEY.BACKSPACE) {
                    if (this.opts.allowClear) {
                        this.clear();
                    }
                    killEvent(e);
                    return;
                }
            }));


            installKeyUpChangeEvent(this.focusser);
            this.focusser.on("keyup-change input", this.bind(function(e) {
                if (this.opts.minimumResultsForSearch >= 0) {
                    e.stopPropagation();
                    if (this.opened()) return;
                    this.open();
                }
            }));

            selection.on("mousedown touchstart", "abbr", this.bind(function (e) {
                if (!this.isInterfaceEnabled()) return;
                this.clear();
                killEventImmediately(e);
                this.close();
                this.selection.focus();
            }));

            selection.on("mousedown touchstart", this.bind(function (e) {
                // Prevent IE from generating a click event on the body
                reinsertElement(selection);

                if (!this.container.hasClass("select2-container-active")) {
                    this.opts.element.trigger($.Event("select2-focus"));
                }

                if (this.opened()) {
                    this.close();
                } else if (this.isInterfaceEnabled()) {
                    this.open();
                }

                killEvent(e);
            }));

            dropdown.on("mousedown touchstart", this.bind(function() {
                if (this.opts.shouldFocusInput(this)) {
                    this.search.focus();
                }
            }));

            selection.on("focus", this.bind(function(e) {
                killEvent(e);
            }));

            this.focusser.on("focus", this.bind(function(){
                if (!this.container.hasClass("select2-container-active")) {
                    this.opts.element.trigger($.Event("select2-focus"));
                }
                this.container.addClass("select2-container-active");
            })).on("blur", this.bind(function() {
                if (!this.opened()) {
                    this.container.removeClass("select2-container-active");
                    this.opts.element.trigger($.Event("select2-blur"));
                }
            }));
            this.search.on("focus", this.bind(function(){
                if (!this.container.hasClass("select2-container-active")) {
                    this.opts.element.trigger($.Event("select2-focus"));
                }
                this.container.addClass("select2-container-active");
            }));

            this.initContainerWidth();
            this.opts.element.addClass("select2-offscreen");
            this.setPlaceholder();

        },

        // single
        clear: function(triggerChange) {
            var data=this.selection.data("select2-data");
            if (data) { // guard against queued quick consecutive clicks
                var evt = $.Event("select2-clearing");
                this.opts.element.trigger(evt);
                if (evt.isDefaultPrevented()) {
                    return;
                }
                var placeholderOption = this.getPlaceholderOption();
                this.opts.element.val(placeholderOption ? placeholderOption.val() : "");
                this.selection.find(".select2-chosen").empty();
                this.selection.removeData("select2-data");
                this.setPlaceholder();

                if (triggerChange !== false){
                    this.opts.element.trigger({ type: "select2-removed", val: this.id(data), choice: data });
                    this.triggerChange({removed:data});
                }
            }
        },

        /**
         * Sets selection based on source element's value
         */
        // single
        initSelection: function () {
            var selected;
            if (this.isPlaceholderOptionSelected()) {
                this.updateSelection(null);
                this.close();
                this.setPlaceholder();
            } else {
                var self = this;
                this.opts.initSelection.call(null, this.opts.element, function(selected){
                    if (selected !== undefined && selected !== null) {
                        self.updateSelection(selected);
                        self.close();
                        self.setPlaceholder();
                        self.nextSearchTerm = self.opts.nextSearchTerm(selected, self.search.val());
                    }
                });
            }
        },

        isPlaceholderOptionSelected: function() {
            var placeholderOption;
            if (this.getPlaceholder() === undefined) return false; // no placeholder specified so no option should be considered
            return ((placeholderOption = this.getPlaceholderOption()) !== undefined && placeholderOption.prop("selected"))
                || (this.opts.element.val() === "")
                || (this.opts.element.val() === undefined)
                || (this.opts.element.val() === null);
        },

        // single
        prepareOpts: function () {
            var opts = this.parent.prepareOpts.apply(this, arguments),
                self=this;

            if (opts.element.get(0).tagName.toLowerCase() === "select") {
                // install the selection initializer
                opts.initSelection = function (element, callback) {
                    var selected = element.find("option").filter(function() { return this.selected && !this.disabled });
                    // a single select box always has a value, no need to null check 'selected'
                    callback(self.optionToData(selected));
                };
            } else if ("data" in opts) {
                // install default initSelection when applied to hidden input and data is local
                opts.initSelection = opts.initSelection || function (element, callback) {
                    var id = element.val();
                    //search in data by id, storing the actual matching item
                    var match = null;
                    opts.query({
                        matcher: function(term, text, el){
                            var is_match = equal(id, opts.id(el));
                            if (is_match) {
                                match = el;
                            }
                            return is_match;
                        },
                        callback: !$.isFunction(callback) ? $.noop : function() {
                            callback(match);
                        }
                    });
                };
            }

            return opts;
        },

        // single
        getPlaceholder: function() {
            // if a placeholder is specified on a single select without a valid placeholder option ignore it
            if (this.select) {
                if (this.getPlaceholderOption() === undefined) {
                    return undefined;
                }
            }

            return this.parent.getPlaceholder.apply(this, arguments);
        },

        // single
        setPlaceholder: function () {
            var placeholder = this.getPlaceholder();

            if (this.isPlaceholderOptionSelected() && placeholder !== undefined) {

                // check for a placeholder option if attached to a select
                if (this.select && this.getPlaceholderOption() === undefined) return;

                this.selection.find(".select2-chosen").html(this.opts.escapeMarkup(placeholder));

                this.selection.addClass("select2-default");

                this.container.removeClass("select2-allowclear");
            }
        },

        // single
        postprocessResults: function (data, initial, noHighlightUpdate) {
            var selected = 0, self = this, showSearchInput = true;

            // find the selected element in the result list

            this.findHighlightableChoices().each2(function (i, elm) {
                if (equal(self.id(elm.data("select2-data")), self.opts.element.val())) {
                    selected = i;
                    return false;
                }
            });

            // and highlight it
            if (noHighlightUpdate !== false) {
                if (initial === true && selected >= 0) {
                    this.highlight(selected);
                } else {
                    this.highlight(0);
                }
            }

            // hide the search box if this is the first we got the results and there are enough of them for search

            if (initial === true) {
                var min = this.opts.minimumResultsForSearch;
                if (min >= 0) {
                    this.showSearch(countResults(data.results) >= min);
                }
            }
        },

        // single
        showSearch: function(showSearchInput) {
            if (this.showSearchInput === showSearchInput) return;

            this.showSearchInput = showSearchInput;

            this.dropdown.find(".select2-search").toggleClass("select2-search-hidden", !showSearchInput);
            this.dropdown.find(".select2-search").toggleClass("select2-offscreen", !showSearchInput);
            //add "select2-with-searchbox" to the container if search box is shown
            $(this.dropdown, this.container).toggleClass("select2-with-searchbox", showSearchInput);
        },

        // single
        onSelect: function (data, options) {

            if (!this.triggerSelect(data)) { return; }

            var old = this.opts.element.val(),
                oldData = this.data();

            this.opts.element.val(this.id(data));
            this.updateSelection(data);

            this.opts.element.trigger({ type: "select2-selected", val: this.id(data), choice: data });

            this.nextSearchTerm = this.opts.nextSearchTerm(data, this.search.val());
            this.close();

            if ((!options || !options.noFocus) && this.opts.shouldFocusInput(this)) {
                this.focusser.focus();
            }

            if (!equal(old, this.id(data))) {
                this.triggerChange({ added: data, removed: oldData });
            }
        },

        // single
        updateSelection: function (data) {

            var container=this.selection.find(".select2-chosen"), formatted, cssClass;

            this.selection.data("select2-data", data);

            container.empty();
            if (data !== null) {
                formatted=this.opts.formatSelection(data, container, this.opts.escapeMarkup);
            }
            if (formatted !== undefined) {
                container.append(formatted);
            }
            cssClass=this.opts.formatSelectionCssClass(data, container);
            if (cssClass !== undefined) {
                container.addClass(cssClass);
            }

            this.selection.removeClass("select2-default");

            if (this.opts.allowClear && this.getPlaceholder() !== undefined) {
                this.container.addClass("select2-allowclear");
            }
        },

        // single
        val: function () {
            var val,
                triggerChange = false,
                data = null,
                self = this,
                oldData = this.data();

            if (arguments.length === 0) {
                return this.opts.element.val();
            }

            val = arguments[0];

            if (arguments.length > 1) {
                triggerChange = arguments[1];
            }

            if (this.select) {
                this.select
                    .val(val)
                    .find("option").filter(function() { return this.selected }).each2(function (i, elm) {
                        data = self.optionToData(elm);
                        return false;
                    });
                this.updateSelection(data);
                this.setPlaceholder();
                if (triggerChange) {
                    this.triggerChange({added: data, removed:oldData});
                }
            } else {
                // val is an id. !val is true for [undefined,null,'',0] - 0 is legal
                if (!val && val !== 0) {
                    this.clear(triggerChange);
                    return;
                }
                if (this.opts.initSelection === undefined) {
                    throw new Error("cannot call val() if initSelection() is not defined");
                }
                this.opts.element.val(val);
                this.opts.initSelection(this.opts.element, function(data){
                    self.opts.element.val(!data ? "" : self.id(data));
                    self.updateSelection(data);
                    self.setPlaceholder();
                    if (triggerChange) {
                        self.triggerChange({added: data, removed:oldData});
                    }
                });
            }
        },

        // single
        clearSearch: function () {
            this.search.val("");
            this.focusser.val("");
        },

        // single
        data: function(value) {
            var data,
                triggerChange = false;

            if (arguments.length === 0) {
                data = this.selection.data("select2-data");
                if (data == undefined) data = null;
                return data;
            } else {
                if (arguments.length > 1) {
                    triggerChange = arguments[1];
                }
                if (!value) {
                    this.clear(triggerChange);
                } else {
                    data = this.data();
                    this.opts.element.val(!value ? "" : this.id(value));
                    this.updateSelection(value);
                    if (triggerChange) {
                        this.triggerChange({added: value, removed:data});
                    }
                }
            }
        }
    });

    MultiSelect2 = clazz(AbstractSelect2, {

        // multi
        createContainer: function () {
            var container = $(document.createElement("div")).attr({
                "class": "select2-container select2-container-multi"
            }).html([
                "<ul class='select2-choices'>",
                "  <li class='select2-search-field'>",
                "    <label for='' class='select2-offscreen'></label>",
                "    <input type='text' autocomplete='off' autocorrect='off' autocapitalize='off' spellcheck='false' class='select2-input'>",
                "  </li>",
                "</ul>",
                "<div class='select2-drop select2-drop-multi select2-display-none'>",
                "   <ul class='select2-results'>",
                "   </ul>",
                "</div>"].join(""));
            return container;
        },

        // multi
        prepareOpts: function () {
            var opts = this.parent.prepareOpts.apply(this, arguments),
                self=this;

            // TODO validate placeholder is a string if specified

            if (opts.element.get(0).tagName.toLowerCase() === "select") {
                // install the selection initializer
                opts.initSelection = function (element, callback) {

                    var data = [];

                    element.find("option").filter(function() { return this.selected && !this.disabled }).each2(function (i, elm) {
                        data.push(self.optionToData(elm));
                    });
                    callback(data);
                };
            } else if ("data" in opts) {
                // install default initSelection when applied to hidden input and data is local
                opts.initSelection = opts.initSelection || function (element, callback) {
                    var ids = splitVal(element.val(), opts.separator);
                    //search in data by array of ids, storing matching items in a list
                    var matches = [];
                    opts.query({
                        matcher: function(term, text, el){
                            var is_match = $.grep(ids, function(id) {
                                return equal(id, opts.id(el));
                            }).length;
                            if (is_match) {
                                matches.push(el);
                            }
                            return is_match;
                        },
                        callback: !$.isFunction(callback) ? $.noop : function() {
                            // reorder matches based on the order they appear in the ids array because right now
                            // they are in the order in which they appear in data array
                            var ordered = [];
                            for (var i = 0; i < ids.length; i++) {
                                var id = ids[i];
                                for (var j = 0; j < matches.length; j++) {
                                    var match = matches[j];
                                    if (equal(id, opts.id(match))) {
                                        ordered.push(match);
                                        matches.splice(j, 1);
                                        break;
                                    }
                                }
                            }
                            callback(ordered);
                        }
                    });
                };
            }

            return opts;
        },

        // multi
        selectChoice: function (choice) {

            var selected = this.container.find(".select2-search-choice-focus");
            if (selected.length && choice && choice[0] == selected[0]) {

            } else {
                if (selected.length) {
                    this.opts.element.trigger("choice-deselected", selected);
                }
                selected.removeClass("select2-search-choice-focus");
                if (choice && choice.length) {
                    this.close();
                    choice.addClass("select2-search-choice-focus");
                    this.opts.element.trigger("choice-selected", choice);
                }
            }
        },

        // multi
        destroy: function() {
            $("label[for='" + this.search.attr('id') + "']")
                .attr('for', this.opts.element.attr("id"));
            this.parent.destroy.apply(this, arguments);

            cleanupJQueryElements.call(this,
                "searchContainer",
                "selection"
            );
        },

        // multi
        initContainer: function () {

            var selector = ".select2-choices", selection;

            this.searchContainer = this.container.find(".select2-search-field");
            this.selection = selection = this.container.find(selector);

            var _this = this;
            this.selection.on("click", ".select2-search-choice:not(.select2-locked)", function (e) {
                //killEvent(e);
                _this.search[0].focus();
                _this.selectChoice($(this));
            });

            // rewrite labels from original element to focusser
            this.search.attr("id", "s2id_autogen"+nextUid());

            this.search.prev()
                .text($("label[for='" + this.opts.element.attr("id") + "']").text())
                .attr('for', this.search.attr('id'));

            this.search.on("input paste", this.bind(function() {
                if (!this.isInterfaceEnabled()) return;
                if (!this.opened()) {
                    this.open();
                }
            }));

            this.search.attr("tabindex", this.elementTabIndex);

            this.keydowns = 0;
            this.search.on("keydown", this.bind(function (e) {
                if (!this.isInterfaceEnabled()) return;

                ++this.keydowns;
                var selected = selection.find(".select2-search-choice-focus");
                var prev = selected.prev(".select2-search-choice:not(.select2-locked)");
                var next = selected.next(".select2-search-choice:not(.select2-locked)");
                var pos = getCursorInfo(this.search);

                if (selected.length &&
                    (e.which == KEY.LEFT || e.which == KEY.RIGHT || e.which == KEY.BACKSPACE || e.which == KEY.DELETE || e.which == KEY.ENTER)) {
                    var selectedChoice = selected;
                    if (e.which == KEY.LEFT && prev.length) {
                        selectedChoice = prev;
                    }
                    else if (e.which == KEY.RIGHT) {
                        selectedChoice = next.length ? next : null;
                    }
                    else if (e.which === KEY.BACKSPACE) {
                        if (this.unselect(selected.first())) {
                            this.search.width(10);
                            selectedChoice = prev.length ? prev : next;
                        }
                    } else if (e.which == KEY.DELETE) {
                        if (this.unselect(selected.first())) {
                            this.search.width(10);
                            selectedChoice = next.length ? next : null;
                        }
                    } else if (e.which == KEY.ENTER) {
                        selectedChoice = null;
                    }

                    this.selectChoice(selectedChoice);
                    killEvent(e);
                    if (!selectedChoice || !selectedChoice.length) {
                        this.open();
                    }
                    return;
                } else if (((e.which === KEY.BACKSPACE && this.keydowns == 1)
                    || e.which == KEY.LEFT) && (pos.offset == 0 && !pos.length)) {

                    this.selectChoice(selection.find(".select2-search-choice:not(.select2-locked)").last());
                    killEvent(e);
                    return;
                } else {
                    this.selectChoice(null);
                }

                if (this.opened()) {
                    switch (e.which) {
                    case KEY.UP:
                    case KEY.DOWN:
                        this.moveHighlight((e.which === KEY.UP) ? -1 : 1);
                        killEvent(e);
                        return;
                    case KEY.ENTER:
                        this.selectHighlighted();
                        killEvent(e);
                        return;
                    case KEY.TAB:
                        this.selectHighlighted({noFocus:true});
                        this.close();
                        return;
                    case KEY.ESC:
                        this.cancel(e);
                        killEvent(e);
                        return;
                    }
                }

                if (e.which === KEY.TAB || KEY.isControl(e) || KEY.isFunctionKey(e)
                 || e.which === KEY.BACKSPACE || e.which === KEY.ESC) {
                    return;
                }

                if (e.which === KEY.ENTER) {
                    if (this.opts.openOnEnter === false) {
                        return;
                    } else if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) {
                        return;
                    }
                }

                this.open();

                if (e.which === KEY.PAGE_UP || e.which === KEY.PAGE_DOWN) {
                    // prevent the page from scrolling
                    killEvent(e);
                }

                if (e.which === KEY.ENTER) {
                    // prevent form from being submitted
                    killEvent(e);
                }

            }));

            this.search.on("keyup", this.bind(function (e) {
                this.keydowns = 0;
                this.resizeSearch();
            })
            );

            this.search.on("blur", this.bind(function(e) {
                this.container.removeClass("select2-container-active");
                this.search.removeClass("select2-focused");
                this.selectChoice(null);
                if (!this.opened()) this.clearSearch();
                e.stopImmediatePropagation();
                this.opts.element.trigger($.Event("select2-blur"));
            }));

            this.container.on("click", selector, this.bind(function (e) {
                if (!this.isInterfaceEnabled()) return;
                if ($(e.target).closest(".select2-search-choice").length > 0) {
                    // clicked inside a select2 search choice, do not open
                    return;
                }
                this.selectChoice(null);
                this.clearPlaceholder();
                if (!this.container.hasClass("select2-container-active")) {
                    this.opts.element.trigger($.Event("select2-focus"));
                }
                this.open();
                this.focusSearch();
                e.preventDefault();
            }));

            this.container.on("focus", selector, this.bind(function () {
                if (!this.isInterfaceEnabled()) return;
                if (!this.container.hasClass("select2-container-active")) {
                    this.opts.element.trigger($.Event("select2-focus"));
                }
                this.container.addClass("select2-container-active");
                this.dropdown.addClass("select2-drop-active");
                this.clearPlaceholder();
            }));

            this.initContainerWidth();
            this.opts.element.addClass("select2-offscreen");

            // set the placeholder if necessary
            this.clearSearch();
        },

        // multi
        enableInterface: function() {
            if (this.parent.enableInterface.apply(this, arguments)) {
                this.search.prop("disabled", !this.isInterfaceEnabled());
            }
        },

        // multi
        initSelection: function () {
            var data;
            if (this.opts.element.val() === "" && this.opts.element.text() === "") {
                this.updateSelection([]);
                this.close();
                // set the placeholder if necessary
                this.clearSearch();
            }
            if (this.select || this.opts.element.val() !== "") {
                var self = this;
                this.opts.initSelection.call(null, this.opts.element, function(data){
                    if (data !== undefined && data !== null) {
                        self.updateSelection(data);
                        self.close();
                        // set the placeholder if necessary
                        self.clearSearch();
                    }
                });
            }
        },

        // multi
        clearSearch: function () {
            var placeholder = this.getPlaceholder(),
                maxWidth = this.getMaxSearchWidth();

            if (placeholder !== undefined  && this.getVal().length === 0 && this.search.hasClass("select2-focused") === false) {
                this.search.val(placeholder).addClass("select2-default");
                // stretch the search box to full width of the container so as much of the placeholder is visible as possible
                // we could call this.resizeSearch(), but we do not because that requires a sizer and we do not want to create one so early because of a firefox bug, see #944
                this.search.width(maxWidth > 0 ? maxWidth : this.container.css("width"));
            } else {
                this.search.val("").width(10);
            }
        },

        // multi
        clearPlaceholder: function () {
            if (this.search.hasClass("select2-default")) {
                this.search.val("").removeClass("select2-default");
            }
        },

        // multi
        opening: function () {
            this.clearPlaceholder(); // should be done before super so placeholder is not used to search
            this.resizeSearch();

            this.parent.opening.apply(this, arguments);

            this.focusSearch();

            // initializes search's value with nextSearchTerm (if defined by user)
            // ignore nextSearchTerm if the dropdown is opened by the user pressing a letter
            if(this.search.val() === "") {
                if(this.nextSearchTerm != undefined){
                    this.search.val(this.nextSearchTerm);
                    this.search.select();
                }
            }

            this.updateResults(true);
            if (this.opts.shouldFocusInput(this)) {
                this.search.focus();
            }
            this.opts.element.trigger($.Event("select2-open"));
        },

        // multi
        close: function () {
            if (!this.opened()) return;
            this.parent.close.apply(this, arguments);
        },

        // multi
        focus: function () {
            this.close();
            this.search.focus();
        },

        // multi
        isFocused: function () {
            return this.search.hasClass("select2-focused");
        },

        // multi
        updateSelection: function (data) {
            var ids = [], filtered = [], self = this;

            // filter out duplicates
            $(data).each(function () {
                if (indexOf(self.id(this), ids) < 0) {
                    ids.push(self.id(this));
                    filtered.push(this);
                }
            });
            data = filtered;

            this.selection.find(".select2-search-choice").remove();
            $(data).each(function () {
                self.addSelectedChoice(this);
            });
            self.postprocessResults();
        },

        // multi
        tokenize: function() {
            var input = this.search.val();
            input = this.opts.tokenizer.call(this, input, this.data(), this.bind(this.onSelect), this.opts);
            if (input != null && input != undefined) {
                this.search.val(input);
                if (input.length > 0) {
                    this.open();
                }
            }

        },

        // multi
        onSelect: function (data, options) {

            if (!this.triggerSelect(data)) { return; }

            this.addSelectedChoice(data);

            this.opts.element.trigger({ type: "selected", val: this.id(data), choice: data });

            // keep track of the search's value before it gets cleared
            this.nextSearchTerm = this.opts.nextSearchTerm(data, this.search.val());

            this.clearSearch();
            this.updateResults();

            if (this.select || !this.opts.closeOnSelect) this.postprocessResults(data, false, this.opts.closeOnSelect===true);

            if (this.opts.closeOnSelect) {
                this.close();
                this.search.width(10);
            } else {
                if (this.countSelectableResults()>0) {
                    this.search.width(10);
                    this.resizeSearch();
                    if (this.getMaximumSelectionSize() > 0 && this.val().length >= this.getMaximumSelectionSize()) {
                        // if we reached max selection size repaint the results so choices
                        // are replaced with the max selection reached message
                        this.updateResults(true);
                    } else {
                        // initializes search's value with nextSearchTerm and update search result
                        if(this.nextSearchTerm != undefined){
                            this.search.val(this.nextSearchTerm);
                            this.updateResults();
                            this.search.select();
                        }
                    }
                    this.positionDropdown();
                } else {
                    // if nothing left to select close
                    this.close();
                    this.search.width(10);
                }
            }

            // since its not possible to select an element that has already been
            // added we do not need to check if this is a new element before firing change
            this.triggerChange({ added: data });

            if (!options || !options.noFocus)
                this.focusSearch();
        },

        // multi
        cancel: function () {
            this.close();
            this.focusSearch();
        },

        addSelectedChoice: function (data) {
            var enableChoice = !data.locked,
                enabledItem = $(
                    "<li class='select2-search-choice'>" +
                    "    <div></div>" +
                    "    <a href='#' class='select2-search-choice-close' tabindex='-1'></a>" +
                    "</li>"),
                disabledItem = $(
                    "<li class='select2-search-choice select2-locked'>" +
                    "<div></div>" +
                    "</li>");
            var choice = enableChoice ? enabledItem : disabledItem,
                id = this.id(data),
                val = this.getVal(),
                formatted,
                cssClass;

            formatted=this.opts.formatSelection(data, choice.find("div"), this.opts.escapeMarkup);
            if (formatted != undefined) {
                choice.find("div").replaceWith("<div>"+formatted+"</div>");
            }
            cssClass=this.opts.formatSelectionCssClass(data, choice.find("div"));
            if (cssClass != undefined) {
                choice.addClass(cssClass);
            }

            if(enableChoice){
              choice.find(".select2-search-choice-close")
                  .on("mousedown", killEvent)
                  .on("click dblclick", this.bind(function (e) {
                  if (!this.isInterfaceEnabled()) return;

                  this.unselect($(e.target));
                  this.selection.find(".select2-search-choice-focus").removeClass("select2-search-choice-focus");
                  killEvent(e);
                  this.close();
                  this.focusSearch();
              })).on("focus", this.bind(function () {
                  if (!this.isInterfaceEnabled()) return;
                  this.container.addClass("select2-container-active");
                  this.dropdown.addClass("select2-drop-active");
              }));
            }

            choice.data("select2-data", data);
            choice.insertBefore(this.searchContainer);

            val.push(id);
            this.setVal(val);
        },

        // multi
        unselect: function (selected) {
            var val = this.getVal(),
                data,
                index;
            selected = selected.closest(".select2-search-choice");

            if (selected.length === 0) {
                throw "Invalid argument: " + selected + ". Must be .select2-search-choice";
            }

            data = selected.data("select2-data");

            if (!data) {
                // prevent a race condition when the 'x' is clicked really fast repeatedly the event can be queued
                // and invoked on an element already removed
                return;
            }

            var evt = $.Event("select2-removing");
            evt.val = this.id(data);
            evt.choice = data;
            this.opts.element.trigger(evt);

            if (evt.isDefaultPrevented()) {
                return false;
            }

            while((index = indexOf(this.id(data), val)) >= 0) {
                val.splice(index, 1);
                this.setVal(val);
                if (this.select) this.postprocessResults();
            }

            selected.remove();

            this.opts.element.trigger({ type: "select2-removed", val: this.id(data), choice: data });
            this.triggerChange({ removed: data });

            return true;
        },

        // multi
        postprocessResults: function (data, initial, noHighlightUpdate) {
            var val = this.getVal(),
                choices = this.results.find(".select2-result"),
                compound = this.results.find(".select2-result-with-children"),
                self = this;

            choices.each2(function (i, choice) {
                var id = self.id(choice.data("select2-data"));
                if (indexOf(id, val) >= 0) {
                    choice.addClass("select2-selected");
                    // mark all children of the selected parent as selected
                    choice.find(".select2-result-selectable").addClass("select2-selected");
                }
            });

            compound.each2(function(i, choice) {
                // hide an optgroup if it doesn't have any selectable children
                if (!choice.is('.select2-result-selectable')
                    && choice.find(".select2-result-selectable:not(.select2-selected)").length === 0) {
                    choice.addClass("select2-selected");
                }
            });

            if (this.highlight() == -1 && noHighlightUpdate !== false){
                self.highlight(0);
            }

            //If all results are chosen render formatNoMatches
            if(!this.opts.createSearchChoice && !choices.filter('.select2-result:not(.select2-selected)').length > 0){
                if(!data || data && !data.more && this.results.find(".select2-no-results").length === 0) {
                    if (checkFormatter(self.opts.formatNoMatches, "formatNoMatches")) {
                        this.results.append("<li class='select2-no-results'>" + evaluate(self.opts.formatNoMatches, self.search.val()) + "</li>");
                    }
                }
            }

        },

        // multi
        getMaxSearchWidth: function() {
            return this.selection.width() - getSideBorderPadding(this.search);
        },

        // multi
        resizeSearch: function () {
            var minimumWidth, left, maxWidth, containerLeft, searchWidth,
                sideBorderPadding = getSideBorderPadding(this.search);

            minimumWidth = measureTextWidth(this.search) + 10;

            left = this.search.offset().left;

            maxWidth = this.selection.width();
            containerLeft = this.selection.offset().left;

            searchWidth = maxWidth - (left - containerLeft) - sideBorderPadding;

            if (searchWidth < minimumWidth) {
                searchWidth = maxWidth - sideBorderPadding;
            }

            if (searchWidth < 40) {
                searchWidth = maxWidth - sideBorderPadding;
            }

            if (searchWidth <= 0) {
              searchWidth = minimumWidth;
            }

            this.search.width(Math.floor(searchWidth));
        },

        // multi
        getVal: function () {
            var val;
            if (this.select) {
                val = this.select.val();
                return val === null ? [] : val;
            } else {
                val = this.opts.element.val();
                return splitVal(val, this.opts.separator);
            }
        },

        // multi
        setVal: function (val) {
            var unique;
            if (this.select) {
                this.select.val(val);
            } else {
                unique = [];
                // filter out duplicates
                $(val).each(function () {
                    if (indexOf(this, unique) < 0) unique.push(this);
                });
                this.opts.element.val(unique.length === 0 ? "" : unique.join(this.opts.separator));
            }
        },

        // multi
        buildChangeDetails: function (old, current) {
            var current = current.slice(0),
                old = old.slice(0);

            // remove intersection from each array
            for (var i = 0; i < current.length; i++) {
                for (var j = 0; j < old.length; j++) {
                    if (equal(this.opts.id(current[i]), this.opts.id(old[j]))) {
                        current.splice(i, 1);
                        if(i>0){
                        	i--;
                        }
                        old.splice(j, 1);
                        j--;
                    }
                }
            }

            return {added: current, removed: old};
        },


        // multi
        val: function (val, triggerChange) {
            var oldData, self=this;

            if (arguments.length === 0) {
                return this.getVal();
            }

            oldData=this.data();
            if (!oldData.length) oldData=[];

            // val is an id. !val is true for [undefined,null,'',0] - 0 is legal
            if (!val && val !== 0) {
                this.opts.element.val("");
                this.updateSelection([]);
                this.clearSearch();
                if (triggerChange) {
                    this.triggerChange({added: this.data(), removed: oldData});
                }
                return;
            }

            // val is a list of ids
            this.setVal(val);

            if (this.select) {
                this.opts.initSelection(this.select, this.bind(this.updateSelection));
                if (triggerChange) {
                    this.triggerChange(this.buildChangeDetails(oldData, this.data()));
                }
            } else {
                if (this.opts.initSelection === undefined) {
                    throw new Error("val() cannot be called if initSelection() is not defined");
                }

                this.opts.initSelection(this.opts.element, function(data){
                    var ids=$.map(data, self.id);
                    self.setVal(ids);
                    self.updateSelection(data);
                    self.clearSearch();
                    if (triggerChange) {
                        self.triggerChange(self.buildChangeDetails(oldData, self.data()));
                    }
                });
            }
            this.clearSearch();
        },

        // multi
        onSortStart: function() {
            if (this.select) {
                throw new Error("Sorting of elements is not supported when attached to <select>. Attach to <input type='hidden'/> instead.");
            }

            // collapse search field into 0 width so its container can be collapsed as well
            this.search.width(0);
            // hide the container
            this.searchContainer.hide();
        },

        // multi
        onSortEnd:function() {

            var val=[], self=this;

            // show search and move it to the end of the list
            this.searchContainer.show();
            // make sure the search container is the last item in the list
            this.searchContainer.appendTo(this.searchContainer.parent());
            // since we collapsed the width in dragStarted, we resize it here
            this.resizeSearch();

            // update selection
            this.selection.find(".select2-search-choice").each(function() {
                val.push(self.opts.id($(this).data("select2-data")));
            });
            this.setVal(val);
            this.triggerChange();
        },

        // multi
        data: function(values, triggerChange) {
            var self=this, ids, old;
            if (arguments.length === 0) {
                 return this.selection
                     .children(".select2-search-choice")
                     .map(function() { return $(this).data("select2-data"); })
                     .get();
            } else {
                old = this.data();
                if (!values) { values = []; }
                ids = $.map(values, function(e) { return self.opts.id(e); });
                this.setVal(ids);
                this.updateSelection(values);
                this.clearSearch();
                if (triggerChange) {
                    this.triggerChange(this.buildChangeDetails(old, this.data()));
                }
            }
        }
    });

    $.fn.select2 = function () {

        var args = Array.prototype.slice.call(arguments, 0),
            opts,
            select2,
            method, value, multiple,
            allowedMethods = ["val", "destroy", "opened", "open", "close", "focus", "isFocused", "container", "dropdown", "onSortStart", "onSortEnd", "enable", "disable", "readonly", "positionDropdown", "data", "search"],
            valueMethods = ["opened", "isFocused", "container", "dropdown"],
            propertyMethods = ["val", "data"],
            methodsMap = { search: "externalSearch" };

        this.each(function () {
            if (args.length === 0 || typeof(args[0]) === "object") {
                opts = args.length === 0 ? {} : $.extend({}, args[0]);
                opts.element = $(this);

                if (opts.element.get(0).tagName.toLowerCase() === "select") {
                    multiple = opts.element.prop("multiple");
                } else {
                    multiple = opts.multiple || false;
                    if ("tags" in opts) {opts.multiple = multiple = true;}
                }

                select2 = multiple ? new window.Select2["class"].multi() : new window.Select2["class"].single();
                select2.init(opts);
            } else if (typeof(args[0]) === "string") {

                if (indexOf(args[0], allowedMethods) < 0) {
                    throw "Unknown method: " + args[0];
                }

                value = undefined;
                select2 = $(this).data("select2");
                if (select2 === undefined) return;

                method=args[0];

                if (method === "container") {
                    value = select2.container;
                } else if (method === "dropdown") {
                    value = select2.dropdown;
                } else {
                    if (methodsMap[method]) method = methodsMap[method];

                    value = select2[method].apply(select2, args.slice(1));
                }
                if (indexOf(args[0], valueMethods) >= 0
                    || (indexOf(args[0], propertyMethods) >= 0 && args.length == 1)) {
                    return false; // abort the iteration, ready to return first matched value
                }
            } else {
                throw "Invalid arguments to select2 plugin: " + args;
            }
        });
        return (value === undefined) ? this : value;
    };

    // plugin defaults, accessible to users
    $.fn.select2.defaults = {
        width: "copy",
        loadMorePadding: 0,
        closeOnSelect: true,
        openOnEnter: true,
        containerCss: {},
        dropdownCss: {},
        containerCssClass: "",
        dropdownCssClass: "",
        formatResult: function(result, container, query, escapeMarkup) {
            var markup=[];
            markMatch(result.text, query.term, markup, escapeMarkup);
            return markup.join("");
        },
        formatSelection: function (data, container, escapeMarkup) {
            return data ? escapeMarkup(data.text) : undefined;
        },
        sortResults: function (results, container, query) {
            return results;
        },
        formatResultCssClass: function(data) {return data.css;},
        formatSelectionCssClass: function(data, container) {return undefined;},
        formatMatches: function (matches) { return matches + " results are available, use up and down arrow keys to navigate."; },
        formatNoMatches: function () { return "No matches found"; },
        formatInputTooShort: function (input, min) { var n = min - input.length; return "Please enter " + n + " or more character" + (n == 1? "" : "s"); },
        formatInputTooLong: function (input, max) { var n = input.length - max; return "Please delete " + n + " character" + (n == 1? "" : "s"); },
        formatSelectionTooBig: function (limit) { return "You can only select " + limit + " item" + (limit == 1 ? "" : "s"); },
        formatLoadMore: function (pageNumber) { return "Loading more results…"; },
        formatSearching: function () { return "Searching…"; },
        minimumResultsForSearch: 0,
        minimumInputLength: 0,
        maximumInputLength: null,
        maximumSelectionSize: 0,
        id: function (e) { return e == undefined ? null : e.id; },
        matcher: function(term, text) {
            return stripDiacritics(''+text).toUpperCase().indexOf(stripDiacritics(''+term).toUpperCase()) >= 0;
        },
        separator: ",",
        tokenSeparators: [],
        tokenizer: defaultTokenizer,
        escapeMarkup: defaultEscapeMarkup,
        blurOnChange: false,
        selectOnBlur: false,
        adaptContainerCssClass: function(c) { return c; },
        adaptDropdownCssClass: function(c) { return null; },
        nextSearchTerm: function(selectedObject, currentSearchTerm) { return undefined; },
        searchInputPlaceholder: '',
        createSearchChoicePosition: 'top',
        shouldFocusInput: function (instance) {
            // Attempt to detect touch devices
            var supportsTouchEvents = (('ontouchstart' in window) ||
                                       (navigator.msMaxTouchPoints > 0));

            // Only devices which support touch events should be special cased
            if (!supportsTouchEvents) {
                return true;
            }

            // Never focus the input if search is disabled
            if (instance.opts.minimumResultsForSearch < 0) {
                return false;
            }

            return true;
        }
    };

    $.fn.select2.ajaxDefaults = {
        transport: $.ajax,
        params: {
            type: "GET",
            cache: false,
            dataType: "json"
        }
    };

    // exports
    window.Select2 = {
        query: {
            ajax: ajax,
            local: local,
            tags: tags
        }, util: {
            debounce: debounce,
            markMatch: markMatch,
            escapeMarkup: defaultEscapeMarkup,
            stripDiacritics: stripDiacritics
        }, "class": {
            "abstract": AbstractSelect2,
            "single": SingleSelect2,
            "multi": MultiSelect2
        }
    };

}(jQuery));

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
/* jshint -W100 */
/* jshint +W100 */
}]);
'use strict';
angular.module('RedhatAccess.cases', [
  'ui.router',
  'ui.bootstrap',
  'ui.select2',
  'ngTable',
  'RedhatAccess.template',
  'RedhatAccess.security',
  'RedhatAccess.search',
  'RedhatAccess.ui-utils',
  'RedhatAccess.common',
  'RedhatAccess.header'
])
.constant('CASE_EVENTS', {
  received: 'case-received'
})
.constant('CHAT_SUPPORT', {
  enableChat: false,
  chatButtonToken: '573A0000000GmiP',
  chatLiveAgentUrlPrefix: 'https://d.la8cs.salesforceliveagent.com/chat',
  chatInitHashOne: '572A0000000GmiP',
  chatInitHashTwo: '00DK000000W3mDA',
  chatIframeHackUrlPrefix:'https://qa-rogsstest.cs9.force.com/chatHidden'

//  chatButtonToken - '573A0000000GmiP'
//  deploymentJS - 'https://c.la8cs.salesforceliveagent.com/content/g/js/31.0/deployment.js'
// chatLiveAgentUrlPrefix - 'https://d.la8cs.salesforceliveagent.com/chat'
// chatInitHashOne - '572A0000000GmiP'
// chatInitHashTwo - '00DK000000W3mDA'
// chatIframeHackUrlPrefix - 'https://qa-rogsstest.cs9.force.com/chatHidden'

})
.constant('ENTITLEMENTS', {
  standard: 'STANDARD',
  premium: 'PREMIUM',
  defaults: 'DEFAULT'
})
.constant('STATUS', {
  open: 'open',
  closed: 'closed',
  both: 'both'
})
.value('NEW_DEFAULTS', {
  'product': '',
  'version': ''
})
.value('GLOBAL_CASE_CONFIG', {
  'showRecommendations': true,
  'showAttachments': true
})
.value('NEW_CASE_CONFIG', {
  'showRecommendations': true,
  'showAttachments': true,
  'showServerSideAttachments': true
})
.value('EDIT_CASE_CONFIG', {
  'showDetails': true,
  'showDescription': true,
  'showBugzillas': true,
  'showAttachments': true,
  'showRecommendations': true,
  'showComments': true,
  'showServerSideAttachments': true,
  'showEmailNotifications': true
})
.config([
  '$stateProvider',
  function ($stateProvider) {

    $stateProvider.state('compact', {
      url: '/case/compact?sessionId',
      templateUrl: 'cases/views/compact.html'
    });

    $stateProvider.state('compact.edit', {
      url: '/{id:[0-9]{1,8}}',
      templateUrl: 'cases/views/compactEdit.html',
      controller: 'CompactEdit'
    });

    $stateProvider.state('edit', {
      url: '/case/{id:[0-9]{1,8}}',
      templateUrl: 'cases/views/edit.html',
      controller: 'Edit'
    });

    $stateProvider.state('new', {
      url: '/case/new',
      templateUrl: 'cases/views/new.html',
      controller: 'New'
    });

    $stateProvider.state('list', {
      url: '/case/list',
      templateUrl: 'cases/views/list.html',
      controller: 'List'
    });

    $stateProvider.state('searchCases', {
      url: '/case/search',
      templateUrl: 'cases/views/search.html',
      controller: 'Search'
    });

    $stateProvider.state('group', {
      url: '/case/group',
      controller: 'Group',
      templateUrl: 'cases/views/group.html'
    });
  }
]);

'use strict';
 /*global $ */

angular.module('RedhatAccess.common', ['RedhatAccess.ui-utils']);
'use strict';
 /*global $ */

angular.module('RedhatAccess.header', [])
  .value('TITLE_VIEW_CONFIG', {
    show: 'false',
    titlePrefix: 'Red Hat Access: ',
    searchTitle: 'Search',
    caseListTitle: 'Support Cases',
    caseViewTitle: 'View/Modify Case',
    newCaseTitle: 'New Support Case',
    searchCaseTitle: 'Search Support Cases',
    logViewerTitle: 'Log',
    manageGroupsTitle: 'Manage Case Groups'
  })
  .controller('TitleViewCtrl', ['TITLE_VIEW_CONFIG', '$scope',
    function(TITLE_VIEW_CONFIG, $scope) {
      $scope.showTitle = TITLE_VIEW_CONFIG.show;
      $scope.titlePrefix = TITLE_VIEW_CONFIG.titlePrefix;
      $scope.getPageTitle = function() {
        switch ($scope.page) {
          case 'search':
            return TITLE_VIEW_CONFIG.searchTitle;
          case 'caseList':
            return TITLE_VIEW_CONFIG.caseListTitle;
          case 'caseView':
            return TITLE_VIEW_CONFIG.caseViewTitle;
          case 'newCase':
            return TITLE_VIEW_CONFIG.newCaseTitle;
          case 'logViewer':
            return TITLE_VIEW_CONFIG.logViewerTitle;
          case 'searchCase':
            return TITLE_VIEW_CONFIG.searchCaseTitle;
          case 'manageGroups':
            return TITLE_VIEW_CONFIG.manageGroupsTitle;
          default:
            return '';
        }
      };
    }
  ])
  .directive('rhaTitletemplate',
    function() {
      return {
        restrict: 'AE',
        scope: {
          page: '@'
        },
        templateUrl: 'common/views/title.html',
        controller: 'TitleViewCtrl'
      };
    })
  .service('AlertService', ['$filter', 'AUTH_EVENTS', '$rootScope', 'RHAUtils',
    function($filter, AUTH_EVENTS, $rootScope, RHAUtils) {
      var ALERT_TYPES = {
        DANGER: 'danger',
        SUCCESS: 'success',
        WARNING: 'warning'
      };

      this.alerts = []; //array of {message: 'some alert', type: '<type>'} objects

      this.clearAlerts = function() {
        this.alerts = [];
      };

      this.addAlert = function(alert) {
        this.alerts.push(alert);
      };

      this.removeAlert = function(alert) {
        this.alerts.splice(this.alerts.indexOf(alert), 1);
      };

      this.addDangerMessage = function(message) {
        return this.addMessage(message, ALERT_TYPES.DANGER);
      };

      this.addSuccessMessage = function(message) {
        return this.addMessage(message, ALERT_TYPES.SUCCESS);
      };

      this.addWarningMessage = function(message) {
        return this.addMessage(message, ALERT_TYPES.WARNING);
      };

      this.addMessage = function(message, type) {
        var alert = {
          message: message,
          type: type === null ? 'warning' : type
        };
        this.addAlert(alert);

        $('body,html').animate({
          scrollTop: $('body').offset().top
        }, 100);

        //Angular adds a unique hash to each alert during data binding,
        //so the returned alert will be unique even if the
        //message and type are identical.
        return alert;
      };

      this.getErrors = function() {
        var errors = $filter('filter')(this.alerts, {
          type: ALERT_TYPES.DANGER
        });

        if (errors === null) {
          errors = [];
        }

        return errors;
      };

      this.addStrataErrorMessage = function(error) {
        if (RHAUtils.isNotEmpty(error)) {
          var existingMessage =
            $filter('filter')(this.alerts, {
              type: ALERT_TYPES.DANGER,
              message: error.message
            });

          if (existingMessage.length < 1) {
            this.addDangerMessage(error.message);
          }
        }
      };

      $rootScope.$on(AUTH_EVENTS.logoutSuccess, angular.bind(this,
        function() {
          this.clearAlerts();
          this.addMessage('You have successfully logged out of the Red Hat Customer Portal.');
        }));
      $rootScope.$on(AUTH_EVENTS.loginSuccess, angular.bind(this,
        function() {
          this.clearAlerts();
        }));

    }
  ])
  .directive('rhaAlert',
    function() {
      return {
        templateUrl: 'common/views/alert.html',
        restrict: 'A',
        controller: 'AlertController'
      };
    })
  .controller('AlertController', ['$scope', 'AlertService',
    function($scope, AlertService) {
      $scope.AlertService = AlertService;

      $scope.closeable = true;

      $scope.closeAlert = function(index) {
        AlertService.alerts.splice(index, 1);
      };

      $scope.dismissAlerts = function() {
        AlertService.clearAlerts();
      };
    }
  ])
  .directive('rhaHeader',
    function() {
      return {
        templateUrl: 'common/views/header.html',
        restrict: 'A',
        scope: {
          page: '@'
        },
        controller: 'HeaderController'
      };
    })
  .controller('HeaderController', ['$scope', 'AlertService',
    function($scope, AlertService) {
      /**
       * For some reason the rhaAlert directive's controller is not binding to the view.
       * Hijacking rhaAlert's parent controller (HeaderController) works
       * until a real solution is found.
       */
      $scope.AlertService = AlertService;

      $scope.closeable = true;

      $scope.closeAlert = function(index) {
        AlertService.alerts.splice(index, 1);
      };

      $scope.dismissAlerts = function() {
        AlertService.clearAlerts();
      };
    }
  ]).factory('configurationService', ['$q',
    function($q) {
      var defer = $q.defer();
      var service = {
        setConfig: function(config) {
          defer.resolve(config);
        },
        getConfig: function() {
          return defer.promise;
        }
      };
      return service;
    }
  ]);

'use strict';
/*jshint unused:vars */

var app = angular.module('RedhatAccess.ui-utils', ['gettext']);

//this is an example controller to provide tree data
// app.controller('TreeViewSelectorCtrl', ['$scope', 'TreeViewSelectorData',
//     function($scope, TreeViewSelectorData) {
//         $scope.name = 'Attachments';
//         $scope.attachmentTree = [];
//         TreeViewSelectorData.getTree('attachments').then(
//             function(tree) {
//                 $scope.attachmentTree = tree;
//             },
//             function() {
//             });
//     }
// ]);
app.service('RHAUtils',
  function() {
    /**
     * Generic function to decide if a simple object should be considered nothing
     */
    this.isEmpty = function(object) {
      if (object === undefined || object === null || object === '' || object.length === 0 || object === {}) {
        return true;
      } else {
        return false
      }
    }

    this.isNotEmpty = function(object) {
      return !this.isEmpty(object);
    }
  }
);

//Wrapper service for translations
app.service('translate', ['gettextCatalog',
  function (gettextCatalog) {
    return function (str) {
      return gettextCatalog.getString(str);
    };
  }
]);

app.directive('rhaChoicetree', function () {
  return {
    template: '<ul><div rha-choice ng-repeat="choice in tree"></div></ul>',
    replace: true,
    transclude: true,
    restrict: 'A',
    scope: {
      tree: '=ngModel',
      rhaDisabled: '='
    }
  };
});

app.directive('rhaChoice', ["$compile", function ($compile) {
  return {
    restrict: 'A',
    templateUrl: 'common/views/treenode.html',
    link: function (scope, elm) {
      scope.choiceClicked = function (choice) {
        choice.checked = !choice.checked;

        function checkChildren(c) {
          angular.forEach(c.children, function (c) {
            c.checked = choice.checked;
            checkChildren(c);
          });
        }
        checkChildren(choice);
      };
      if (scope.choice.children.length > 0) {
        var childChoice = $compile('<div rha-choicetree ng-show="!choice.collapsed" ng-model="choice.children"></div>')(scope);
        elm.append(childChoice);
      }
    }
  };
}]);



app.factory('TreeViewSelectorData', ['$http', '$q', 'TreeViewSelectorUtils',
  function ($http, $q, TreeViewSelectorUtils) {
    var service = {
      getTree: function (dataUrl, sessionId) {
        var defer = $q.defer();
        var tmpUrl = dataUrl;
        if(sessionId){
          tmpUrl = tmpUrl + '?sessionId=' + encodeURIComponent(sessionId)
        }
        $http({
          method: 'GET',
          url: tmpUrl
        }).success(function (data, status, headers, config) {
          var tree = [];
          TreeViewSelectorUtils.parseTreeList(tree, data);
          defer.resolve(tree);
        }).error(function (data, status, headers, config) {
          defer.reject({});
        });
        return defer.promise;
      }
    };
    return service;
  }
]);

app.factory('TreeViewSelectorUtils',
  function () {
    var parseTreeNode = function (splitPath, tree, fullFilePath) {
      if (splitPath[0] !== undefined) {
        if (splitPath[0] !== '') {
          var node = splitPath[0];
          var match = false;
          var index = 0;
          for (var i = 0; i < tree.length; i++) {
            if (tree[i].name === node) {
              match = true;
              index = i;
              break;
            }
          }
          if (!match) {
            var nodeObj = {};
            nodeObj.checked = isLeafChecked(node);
            nodeObj.name = removeParams(node);
            if (splitPath.length === 1) {
              nodeObj.fullPath = removeParams(fullFilePath);
            }
            nodeObj.children = [];
            tree.push(nodeObj);
            index = tree.length - 1;
          }
          splitPath.shift();
          parseTreeNode(splitPath, tree[index].children, fullFilePath);
        } else {
          splitPath.shift();
          parseTreeNode(splitPath, tree, fullFilePath);
        }
      }
    };

    var removeParams = function (path) {
      if (path) {
        var split = path.split('?');
        return split[0];
      }
      return path;
    };

    var isLeafChecked = function (path) {
      if (path) {
        var split = path.split('?');
        if (split[1]) {
          var params = split[1].split('&');
          for (var i = 0; i < params.length; i++) {
            if (params[i].indexOf('checked=true') !== -1) {
              return true;
            }
          }
        }
      }
      return false;
    };

    var hasSelectedLeaves = function (tree) {

      for (var i = 0; i < tree.length; i++) {
        if (tree[i] !== undefined) {
          if (tree[i].children.length === 0) {
            //we only check leaf nodes
            if (tree[i].checked === true) {
              return true;
            }
          } else {
            if (hasSelectedLeaves(tree[i].children)) {
              return true;
            }
          }
        }
      }
      return false;
    };

    var getSelectedNames = function (tree, container) {
      for (var i = 0; i < tree.length; i++) {
        if (tree[i] !== undefined) {
          if (tree[i].children.length === 0) {
            if (tree[i].checked === true) {
              container.push(tree[i].fullPath);
            }
          } else {
            getSelectedNames(tree[i].children, container);
          }
        }
      }
    };

    var service = {
      parseTreeList: function (tree, data) {
        var files = data.split('\n');
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          var splitPath = file.split('/');
          parseTreeNode(splitPath, tree, file);
        }
      },
      hasSelections: function (tree) {
        return hasSelectedLeaves(tree);
      },
      getSelectedLeaves: function (tree) {
        if (tree === undefined) {
          return [];
        }
        var container = [];
        getSelectedNames(tree, container);
        return container;
      }
    };
    return service;
  });

app.directive('rhaResizable', [
  '$window',
  '$timeout',
  function ($window) {

    var link = function (scope, element, attrs) {

      scope.onResizeFunction = function () {
        var distanceToTop = element[0].getBoundingClientRect().top;
        var height = $window.innerHeight - distanceToTop;
        element.css('height', height);
      };

      angular.element($window).bind(
        'resize',
        function () {
          scope.onResizeFunction();
          //scope.$apply();
        }
      );
      angular.element($window).bind(
        'click',
        function () {
          scope.onResizeFunction();
          //scope.$apply();
        }
      );

      if (attrs.rhaDomReady !== undefined) {
        scope.$watch('rhaDomReady', function (newValue) {
          if (newValue) {
            scope.onResizeFunction();
          }
        });
      } else {
        scope.onResizeFunction();
      }


    };

    return {
      restrict: 'A',
      scope: {
        rhaDomReady: '='
      },
      link: link
    };
  }
]);

//var testURL = 'http://localhost:8080/LogCollector/';
// angular module
angular.module('RedhatAccess.logViewer',
	[ 'angularTreeview', 'ui.bootstrap', 'RedhatAccess.search', 'RedhatAccess.header'])
.config([ '$stateProvider', function($stateProvider) {
	$stateProvider.state('logviewer', {
		url : "/logviewer",
		templateUrl : 'log_viewer/views/log_viewer.html'
	})
}])
.constant('LOGVIEWER_EVENTS', {
    allTabsClosed: 'allTabsClosed'
  })
.value('hideMachinesDropdown', {value:false});

function parseList(tree, data) {
	var files = data.split("\n");
	for ( var i in files) {
		var file = files[i];
		var splitPath = file.split("/");
		returnNode(splitPath, tree, file);
	}
}

function returnNode(splitPath, tree, fullFilePath) {
	if (splitPath[0] != null) {
		if (splitPath[0] != "") {
			var node = splitPath[0];
			var match = false;
			var index = 0;
			for ( var i in tree) {
				if (tree[i].roleName == node) {
					match = true;
					index = i;
					break;
				}
			}
			if (!match) {
				var object = new Object();
				object.roleName = node;
				object.roleId = node;
				if (splitPath.length == 1) {
					object.fullPath = fullFilePath;
				}
				object.children = new Array();
				tree.push(object);
				index = tree.length - 1;
			}

			splitPath.shift();
			returnNode(splitPath, tree[index].children, fullFilePath);
		} else {
			splitPath.shift();
			returnNode(splitPath, tree, fullFilePath);
		}
	}
}
/*jshint camelcase: false */
'use strict';
/*global strata */
/*jshint unused:vars */

/**
 * @ngdoc module
 * @name
 *
 * @description
 *
 */
angular.module('RedhatAccess.search', [
  'ui.router',
  'RedhatAccess.template',
  'RedhatAccess.security',
  'ui.bootstrap',
  'ngSanitize',
  'RedhatAccess.ui-utils',
  'RedhatAccess.common',
  'RedhatAccess.header'
])
  .constant('RESOURCE_TYPES', {
    article: 'Article',
    solution: 'Solution',

  })
  .constant('SEARCH_PARAMS', {
    limit: 10

  })
  .value('SEARCH_CONFIG', {
    openCaseRef: null,
    showOpenCaseBtn: true
  })
  .config(['$stateProvider',
    function ($stateProvider) {
      $stateProvider.state('search', {
        url: '/search',
        controller: 'SearchController',
        templateUrl: 'search/views/search.html'
      }).state('search_accordion', { //TEMPORARY
        url: '/search2',
        controller: 'SearchController',
        templateUrl: 'search/views/accordion_search.html'

      });
    }
  ])
  .controller('SearchController', ['$scope',
    '$location', 'SearchResultsService', 'SEARCH_CONFIG', 'securityService', 'AlertService',
    function ($scope, $location, SearchResultsService, SEARCH_CONFIG, securityService, AlertService) {
      $scope.results = SearchResultsService.results;
      $scope.selectedSolution = SearchResultsService.currentSelection;
      $scope.searchInProgress = SearchResultsService.searchInProgress;
      $scope.currentSearchData = SearchResultsService.currentSearchData;



      $scope.getOpenCaseRef = function () {
        if (SEARCH_CONFIG.openCaseRef !== null) {
          //TODO data may be complex type - need to normalize to string in future
          return SEARCH_CONFIG.openCaseRef + '?data=' + SearchResultsService.currentSearchData.data;
        } else {
          return '#/case/new?data=' + SearchResultsService.currentSearchData.data;
        }
      };

      $scope.solutionSelected = function (index) {
        var response = $scope.results[index];
        SearchResultsService.setSelected(response, index);

      };

      $scope.search = function (searchStr, limit) {

        SearchResultsService.search(searchStr, limit);

      };

      $scope.diagnose = function (data, limit) {

        SearchResultsService.diagnose(data, limit);
      };

      $scope.triggerAnalytics = function($event) {
        if(this.isopen && window.portal && $location.path() === '/case/new'){
          chrometwo_require(['analytics/main'], function (analytics) {
             analytics.trigger('OpenSupportCaseRecommendationClick', $event);
          });
        }
      };
      $scope.$watch(function () {
          return SearchResultsService.currentSelection;
        },
        function (newVal) {
          $scope.selectedSolution = newVal;
        }
      );

    }
  ])
  .directive('rhaAccordionsearchresults', ['SEARCH_CONFIG',
    function (SEARCH_CONFIG) {
      return {
        restrict: 'AE',
        scope: false,
        templateUrl: 'search/views/accordion_search_results.html',
        link: function (scope, element, attr) {
          scope.showOpenCaseBtn = function () {
            if (SEARCH_CONFIG.showOpenCaseBtn && (attr && attr.opencase === 'true')) {
              return true;
            } else {
              return false;
            }
          };
        }
      };
    }
  ])
  .directive('rhaListsearchresults', function () {
    return {
      restrict: 'AE',
      scope: false,
      templateUrl: 'search/views/list_search_results.html'
    };
  })
  .directive('rhaSearchform', function () {
    return {
      restrict: 'AE',
      scope: false,
      templateUrl: 'search/views/search_form.html'
    };
  })
  .directive('rhaStandardsearch', function () {
    return {
      restrict: 'AE',
      scope: false,
      templateUrl: 'search/views/standard_search.html'
    };
  })
  .directive('rhaResultdetaildisplay', ['RESOURCE_TYPES',
    function (RESOURCE_TYPES) {
      return {
        restrict: 'AE',
        scope: {
          result: '='
        },
        link: function (scope, element, attr) {
          scope.isSolution = function () {
            if (scope.result !== undefined && scope.result.resource_type !== undefined) {
              if (scope.result.resource_type === RESOURCE_TYPES.solution) {
                return true;
              } else {
                return false;
              }
            }
            return false;
          };
          scope.isArticle = function () {
            if (scope.result !== undefined && scope.result.resource_type !== undefined) {
              if (scope.result.resource_type === RESOURCE_TYPES.article) {
                return true;
              } else {
                return false;
              }
            }
            return false;
          };
          scope.getSolutionResolution = function () {
            var resolution_html = '';
            if (scope.result.resolution !== undefined) {
              resolution_html = scope.result.resolution.html;
            }
            return resolution_html;
          };

          scope.getArticleHtml = function () {
            if (scope.result === undefined) {
              return '';
            }
            if (scope.result.body !== undefined) {
              if (scope.result.body.html !== undefined) {
                //this is for newer version of strata
                return scope.result.body.html;
              } else {
                //handle old markdown format
                return scope.result.body;
              }
            } else {
              return '';
            }
          };

        },
        templateUrl: 'search/views/resultDetail.html'
      };
    }
  ])
  .factory('SearchResultsService', ['$q', '$rootScope', 'AUTH_EVENTS', 'RESOURCE_TYPES', 'SEARCH_PARAMS', 'AlertService', 'securityService',

    function ($q, $rootScope, AUTH_EVENTS, RESOURCE_TYPES, SEARCH_PARAMS, AlertService, securityService) {
      var searchArticlesOrSolutions = function (searchString, limit) {
        //var that = this;
        if ((limit === undefined) || (limit < 1)) {
          limit = SEARCH_PARAMS.limit;
        }
        service.clear();
        AlertService.clearAlerts();

        service.setCurrentSearchData(searchString, 'search');
        var deferreds = [];
        strata.search(
          searchString,
          function (entries) {
            //retrieve details for each solution
            if (entries !== undefined) {
              if (entries.length === 0) {
                AlertService.addSuccessMessage('No recommendations found.');
              }
              entries.forEach(function (entry) {
                var deferred = $q.defer();
                deferreds.push(deferred.promise);
                strata.utils.getURI(
                  entry.uri,
                  entry.resource_type,
                  function (type, info) {
                    if (info !== undefined) {
                      info.resource_type = type;
                    }
                    deferred.resolve(info);
                  },
                  function (error) {
                    deferred.resolve();
                  });
              });
            } else {
              AlertService.addSuccessMessage('No recommendations found.');
            }
            $q.all(deferreds).then(
              function (results) {
                results.forEach(function (result) {
                  if (result !== undefined) {
                    service.add(result);
                  }
                });
                service.searchInProgress.value = false;
              },
              function (error) {
                service.searchInProgress.value = false;
              }
            );
          },
          function (error) {
            $rootScope.$apply(function () {
              service.searchInProgress.value = false;
              AlertService.addDangerMessage(error);
            });
          },
          limit,
          false
        );
      };
      var searchProblems = function (data, limit) {
        if ((limit === undefined) || (limit < 1)) {
          limit = SEARCH_PARAMS.limit;
        }
        service.clear();
        AlertService.clearAlerts();
        var deferreds = [];
        service.searchInProgress.value = true;
        service.setCurrentSearchData(data, 'diagnose');
        strata.problems(
          data,
          function (solutions) {
            //retrieve details for each solution
            if (solutions !== undefined) {
              if (solutions.length === 0) {
                AlertService.addSuccessMessage('No solutions found.');
              }

              solutions.forEach(function (solution) {
                var deferred = $q.defer();
                deferreds.push(deferred.promise);
                strata.solutions.get(
                  solution.uri,
                  function (solution) {
                    deferred.resolve(solution);
                  },
                  function (error) {
                    deferred.resolve();
                  });
              });
            } else {
              AlertService.addSuccessMessage('No solutions found.');
            }
            $q.all(deferreds).then(
              function (solutions) {
                solutions.forEach(function (solution) {
                  if (solution !== undefined) {
                    solution.resource_type = RESOURCE_TYPES.solution;
                    service.add(solution);
                  }
                });
                service.searchInProgress.value = false;
              },
              function (error) {
                service.searchInProgress.value = false;
              }
            );
          },

          function (error) {
            $rootScope.$apply(function () {
              service.searchInProgress.value = false;
              AlertService.addDangerMessage(error);
            });
          },
          limit
        );
      };
      var service = {
        results: [],
        currentSelection: {
          data: {},
          index: -1
        },
        searchInProgress: {
          value: false
        },
        currentSearchData: {
          data: '',
          method: ''
        },

        add: function (result) {
          this.results.push(result);
        },
        clear: function () {
          this.results.length = 0;
          this.setSelected({}, -1);
          this.setCurrentSearchData('', '');

        },
        setSelected: function (selection, index) {
          this.currentSelection.data = selection;
          this.currentSelection.index = index;
        },
        setCurrentSearchData: function (data, method) {
          this.currentSearchData.data = data;
          this.currentSearchData.method = method;
        },
        search: function (searchString, limit) {
          this.searchInProgress.value = true;
          var that = this;
          securityService.validateLogin(true).then(
            function (authedUser) {
              searchArticlesOrSolutions(searchString, limit);
            },
            function (error) {
              that.searchInProgress.value = false;
              AlertService.addDangerMessage('You must be logged in to use this functionality.');
            });

        },
        diagnose: function (data, limit) {
          this.searchInProgress.value = true;
          var that = this;
          securityService.validateLogin(true).then(
            function (authedUser) {
              searchProblems(data, limit);
            },
            function (error) {
              that.searchInProgress.value = false;
              AlertService.addDangerMessage('You must be logged in to use this functionality.');
            });

        }
      };

      $rootScope.$on(AUTH_EVENTS.logoutSuccess, function () {
        service.clear.apply(service);
      });

      return service;
    }
  ]);
'use strict';
/*global strata,$*/
/*jshint unused:vars */
/*jshint camelcase: false */
angular.module('RedhatAccess.security', ['ui.bootstrap', 'RedhatAccess.template', 'ui.router', 'RedhatAccess.common', 'RedhatAccess.header'])
  .constant('AUTH_EVENTS', {
    loginSuccess: 'auth-login-success',
    loginFailed: 'auth-login-failed',
    logoutSuccess: 'auth-logout-success',
    sessionTimeout: 'auth-session-timeout',
    notAuthenticated: 'auth-not-authenticated',
    notAuthorized: 'auth-not-authorized',
    sessionIdChanged: 'sid-changed'
  })
  .directive('rhaLoginstatus', function () {
    return {
      restrict: 'AE',
      scope: false,
      templateUrl: 'security/login_status.html'
    };
  })
  .controller('SecurityController', ['$scope', '$rootScope', 'securityService', 'SECURITY_CONFIG',
    function ($scope, $rootScope, securityService, SECURITY_CONFIG) {
      $scope.securityService = securityService;
      if (SECURITY_CONFIG.autoCheckLogin) {
        securityService.validateLogin(SECURITY_CONFIG.forceLogin);
      }
      $scope.displayLoginStatus = function () {
        return SECURITY_CONFIG.displayLoginStatus;

      };
    }
  ])
  .value('LOGIN_VIEW_CONFIG', {
    verbose: true,
  })
  .value('SECURITY_CONFIG', {
    displayLoginStatus: true,
    autoCheckLogin: true,
    loginURL: '',
    logoutURL: '',
    forceLogin: false,

  })
  .service('securityService', [
    '$rootScope',
    '$modal',
    'AUTH_EVENTS',
    '$q',
    'LOGIN_VIEW_CONFIG',
    'SECURITY_CONFIG',
    'strataService',
    'AlertService',
    'RHAUtils',
    function (
      $rootScope,
      $modal,
      AUTH_EVENTS,
      $q,
      LOGIN_VIEW_CONFIG,
      SECURITY_CONFIG,
      strataService,
      AlertService,
      RHAUtils) {

      this.loginStatus = {
        isLoggedIn: false,
        loggedInUser: '',
        verifying: false,
        isInternal: false,
        orgAdmin: false,
        hasChat: false,
        sessionId: '',
        canAddAttachments: false,
        ssoName: ''
      };

      this.loginURL = SECURITY_CONFIG.loginURL;
      this.logoutURL = SECURITY_CONFIG.logoutURL;

      this.setLoginStatus = function (
        isLoggedIn,
        userName,
        verifying,
        isInternal,
        orgAdmin,
        hasChat,
        sessionId,
        canAddAttachments,
        ssoName) {
        this.loginStatus.isLoggedIn = isLoggedIn;
        this.loginStatus.loggedInUser = userName;
        this.loginStatus.verifying = verifying;
        this.loginStatus.isInternal = isInternal;
        this.loginStatus.orgAdmin = orgAdmin;
        this.loginStatus.hasChat = hasChat;
        this.loginStatus.sessionId = sessionId;
        this.loginStatus.canAddAttachments = canAddAttachments;
        this.loginStatus.ssoName = ssoName;
      };

      this.clearLoginStatus = function () {
        this.loginStatus.isLoggedIn = false;
        this.loginStatus.loggedInUser = '';
        this.loginStatus.verifying = false;
        this.loginStatus.isInternal = false;
        this.loginStatus.orgAdmin = false;
        this.loginStatus.hasChat = false;
        this.loginStatus.sessionId = '';
        this.loginStatus.canAddAttachments = false;
        this.loginStatus.account = {};
        this.loginStatus.ssoName = '';

      };

      this.setAccount = function (accountJSON) {
        this.loginStatus.account = accountJSON;
      };

      var modalDefaults = {
        backdrop: 'static',
        keyboard: true,
        modalFade: true,
        templateUrl: 'security/login_form.html',
        windowClass: 'rha-login-modal'
      };

      var modalOptions = {
        closeButtonText: 'Close',
        actionButtonText: 'OK',
        headerText: 'Proceed?',
        bodyText: 'Perform this action?',
        backdrop: 'static'

      };



      this.userAllowedToManageEmailNotifications = function (user) {
        if ((RHAUtils.isNotEmpty(this.loginStatus.account) && RHAUtils.isNotEmpty(this.loginStatus.account)) &&
          ((this.loginStatus.orgAdmin))) {
          return true;
        } else {
          return false;
        }
      };

      this.userAllowedToManageGroups = function (user) {
        if ((RHAUtils.isNotEmpty(this.loginStatus.account) && RHAUtils.isNotEmpty(this.loginStatus.account)) &&
          ((!this.loginStatus.account.has_group_acls || this.loginStatus.account.has_group_acls && this.loginStatus.orgAdmin))) {
          return true;
        } else {
          return false;
        }
      };

      this.getBasicAuthToken = function () {
        var defer = $q.defer();
        var token = localStorage.getItem('rhAuthToken');
        if (token !== undefined && token !== '') {
          defer.resolve(token);
          return defer.promise;
        } else {
          this.login().then(
            function (authedUser) {
              defer.resolve(localStorage.getItem('rhAuthToken'));
            },
            function (error) {
              defer.resolve(error);
            });
          return defer.promise;
        }
      };

      this.loggingIn = false;

      this.initLoginStatus = function () {
        this.loggingIn = true;

        var defer = $q.defer();
        var that = this;
        var wasLoggedIn = this.loginStatus.isLoggedIn;
        var currentSid = this.loginStatus.sessionId;
        this.loginStatus.verifying = true;
        strata.checkLogin(
          angular.bind(this, function (result, authedUser) {
            if (result) {
              var sidChanged = (currentSid !== authedUser.session_id);
              strataService.accounts.list().then(
                angular.bind(this, function (accountNumber) {
                  strataService.accounts.get(accountNumber).then(
                    angular.bind(this, function (account) {
                      that.setAccount(account);
                      that.setLoginStatus(
                        true,
                        authedUser.name,
                        false,
                        authedUser.is_internal,
                        authedUser.org_admin,
                        authedUser.has_chat,
                        authedUser.session_id,
                        authedUser.can_add_attachments,
                        authedUser.login);
                      //console.log(that.loginStatus);
                      //console.log(authedUser);
                      this.loggingIn = false;
                      //We don't want to resend the AUTH_EVENTS.loginSuccess if we are already logged in
                      if (wasLoggedIn === false) {
                        $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
                      }
                      if (sidChanged) {
                        $rootScope.$broadcast(AUTH_EVENTS.sessionIdChanged);
                      }
                      defer.resolve(authedUser.name);
                    })
                  );
                }),
                angular.bind(this, function (error) {
                  AlertService.addStrataErrorMessage(error);
                  this.loggingIn = false;
                  defer.resolve(authedUser.name);
                })
              );
            } else {
              this.loggingIn = false;
              that.clearLoginStatus();
              defer.reject('');
            }
          })
        );
        return defer.promise;
      };

      this.validateLogin = function (forceLogin) {
        var defer = $q.defer();
        var that = this;
        if (!forceLogin) {
          this.initLoginStatus().then(
            function (username) {
              defer.resolve(username);
            },
            function (error) {
              defer.reject(error);
            }
          );
          return defer.promise;
        } else {
          this.initLoginStatus().then(
            function (username) {
              defer.resolve(username);
            },
            function (error) {
              that.login().then(
                function (authedUser) {
                  defer.resolve(authedUser.name);
                },
                function (error) {
                  defer.reject(error);
                });
            }
          );
          return defer.promise;
        }
      };

      this.login = function () {
        var that = this;
        var result = this.showLogin(modalDefaults, modalOptions);
        result.then(
          function (authedUser) {
            that.setLoginStatus(true, authedUser.name, false, authedUser.is_internal);
          },
          function (error) {
            that.clearLoginStatus();
          });
        return result; // pass on the promise
      };

      this.logout = function () {
        strata.clearCredentials();
        this.clearLoginStatus();
        $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
      };

      this.getLoggedInUserName = function () {
        return strata.getAuthInfo().name;
      };

      this.showLogin = function (customModalDefaults, customModalOptions) {
        var that = this;
        //Create temp objects to work with since we're in a singleton service
        var tempModalDefaults = {};
        var tempModalOptions = {};
        //Map angular-ui modal custom defaults to modal defaults defined in service
        angular.extend(tempModalDefaults, modalDefaults, customModalDefaults);
        //Map modal.html $scope custom properties to defaults defined in service
        angular.extend(tempModalOptions, modalOptions, customModalOptions);
        if (!tempModalDefaults.controller) {
          tempModalDefaults.controller = ['$scope', '$modalInstance',
            function ($scope, $modalInstance) {
              $scope.user = {
                user: null,
                password: null
              };
              $scope.useVerboseLoginView = LOGIN_VIEW_CONFIG.verbose;
              $scope.modalOptions = tempModalOptions;
              $scope.modalOptions.ok = function (result) {
                //Hack below is needed to handle autofill issues
                //@see https://github.com/angular/angular.js/issues/1460
                //BEGIN HACK
                $scope.user.user = $('#rha-login-user-id').val();
                $scope.user.password = $('#rha-login-password').val();
                //END HACK
                strata.setCredentials($scope.user.user, $scope.user.password,
                  function (passed, authedUser) {
                    if (passed) {
                      $scope.user.password = '';
                      $scope.authError = null;
                      try {
                        $modalInstance.close(authedUser);
                      } catch (err) {}
                      that.setLoginStatus(
                        true,
                        authedUser.name,
                        false,
                        authedUser.is_internal,
                        authedUser.org_admin,
                        authedUser.has_chat,
                        authedUser.session_id,
                        authedUser.can_add_attachments,
                        authedUser.login);
                      $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
                    } else {
                      // alert("Login failed!");
                      $rootScope.$broadcast(AUTH_EVENTS.loginFailed);
                      if ($scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') {
                        $scope.$apply(function () {
                          $scope.authError = 'Login Failed!';
                        });
                      } else {
                        $scope.authError = 'Login Failed!';
                      }
                    }
                  });

              };
              $scope.modalOptions.close = function () {
                $modalInstance.dismiss();
              };
            }
          ];
        }

        return $modal.open(tempModalDefaults).result;
      };

    }
  ]);
'use strict';
/*global strata*/
/*jshint camelcase: false */
/*jshint unused:vars */

angular.module('RedhatAccess.common')
  .factory('strataService', ['$q', 'translate', 'RHAUtils',
    function ($q, translate, RHAUtils) {

      var errorHandler = function (message, xhr, response, status) {

        var translatedMsg = message;

        switch (status) {
        case 'Unauthorized':
          translatedMsg = translate('Unauthorized.');
          break;
        // case n:
        //   code block
        //   break;
        }
        this.reject({
          message: translatedMsg,
          xhr: xhr,
          response: response,
          status: status
        });
      };

      return {
        entitlements: {
          //entitlements.get
          get: function(showAll, ssoUserName) {
            var deferred = $q.defer();

            strata.entitlements.get(
              showAll,
              function (entitlements) {
                deferred.resolve(entitlements);
              },
              angular.bind(deferred, errorHandler),
              ssoUserName
            );

            return deferred.promise; 
          }
        },
        problems: function (data, max) {
          var deferred = $q.defer();

          strata.problems(
            data,
            function (solutions) {
              deferred.resolve(solutions);
            },
            angular.bind(deferred, errorHandler),
            max
          );

          return deferred.promise;
        },
        solutions: {
          //solutions.get
          get: function (uri) {
            var deferred = $q.defer();

            strata.solutions.get(
              uri,
              function (solution) {
                deferred.resolve(solution);
              },
              function () {
                //workaround for 502 from strata
                //If the deferred is rejected then the parent $q.all()
                //based deferred will fail. Since we don't need every
                //recommendation just send back undefined
                //and the caller can ignore the missing solution details.
                deferred.resolve();
              }
            );

            return deferred.promise;
          }
        },
        products: {
          //products.list
          list: function () {
            var deferred = $q.defer();

            strata.products.list(
              function (response) {
                deferred.resolve(response);
              },
              angular.bind(deferred, errorHandler)
            );

            return deferred.promise;
          },
          //products.versions
          versions: function (productCode) {
            var deferred = $q.defer();

            strata.products.versions(
              productCode,
              function (response) {
                deferred.resolve(response);
              },
              angular.bind(deferred, errorHandler)
            );

            return deferred.promise;
          }
        },
        groups: {
          //groups.list
          list: function (ssoUserName) {
            var deferred = $q.defer();

            strata.groups.list(
              function (response) {
                deferred.resolve(response);
              },
              angular.bind(deferred, errorHandler),
              ssoUserName
            );

            return deferred.promise;
          },
          //groups.remove
          remove: function(groupNum) {
            var deferred = $q.defer();

            strata.groups.remove(
              groupNum,
              function (response) {
                deferred.resolve(response);
              },
              angular.bind(deferred, errorHandler)
            );

            return deferred.promise;
          },
          //groups.create
          create: function(groupName) {
            var deferred = $q.defer();

            strata.groups.create(
              groupName,
              function (response) {
                deferred.resolve(response);
              },
              angular.bind(deferred, errorHandler)
            );

            return deferred.promise;
          }
        },
        accounts: {
          //accounts.get
          get: function(accountNumber) {
            var deferred = $q.defer();

            strata.accounts.get(
              accountNumber,
              function(response) {
                deferred.resolve(response);
              },
              angular.bind(deferred, errorHandler)
            );

            return deferred.promise;
          },
          //accounts.users
          users: function(accountNumber, group) {
            var deferred = $q.defer();

            strata.accounts.users(
              accountNumber,
              function(response) {
                deferred.resolve(response);
              },
              angular.bind(deferred, errorHandler),
              group
            );

            return deferred.promise;
          },
          //accounts.list
          list: function() {
            var deferred = $q.defer();

            strata.accounts.list(
              function(response) {
                deferred.resolve(response);
              },
              angular.bind(deferred, errorHandler)
            );

            return deferred.promise;
          }
        },
        cases: {
          //cases.csv
          csv: function() {
            var deferred = $q.defer();

            strata.cases.csv(
                function (response) {
                  deferred.resolve(response);
                },
                angular.bind(deferred, errorHandler)
            );

            return deferred.promise;
          },
          attachments: {
            //cases.attachments.list
            list: function (id) {
              var deferred = $q.defer();

              strata.cases.attachments.list(
                id,
                function (response) {
                  deferred.resolve(response);
                },
                angular.bind(deferred, errorHandler)
              );

              return deferred.promise;
            },
            //cases.attachments.post
            post: function (attachment, caseNumber) {
              var deferred = $q.defer();

              strata.cases.attachments.post(
                attachment,
                caseNumber,
                function (response, code, xhr) {
                  deferred.resolve(xhr.getResponseHeader('Location'));
                },
                angular.bind(deferred, errorHandler)
              );

              return deferred.promise;
            },
            //cases.attachments.remove
            remove: function (id, caseNumber) {

              var deferred = $q.defer();

              strata.cases.attachments.remove(
                id,
                caseNumber,
                function (response) {
                  deferred.resolve(response);
                },
                angular.bind(deferred, errorHandler)
              );

              return deferred.promise;
            }
          },
          comments: {
            //cases.comments.get
            get: function (id) {
              var deferred = $q.defer();

              strata.cases.comments.get(
                id,
                function (response) {
                  deferred.resolve(response);
                },
                angular.bind(deferred, errorHandler)
              );

              return deferred.promise;
            },
            //cases.comments.post
            post: function (case_number, text, isDraft) {
              var deferred = $q.defer();

              strata.cases.comments.post(
                case_number, 
                {
                  'text': text,
                  'draft': isDraft === true ? 'true' : 'false'
                },
                function (response) {
                  deferred.resolve(response);
                },
                angular.bind(deferred, errorHandler)
              );

              return deferred.promise;
            },
            //cases.comments.put
            put: function(case_number, text, isDraft, comment_id) {
              var deferred = $q.defer();

              strata.cases.comments.update(
                case_number,
                {
                  'text': text,
                  'draft': isDraft === true ? 'true' : 'false',
                  'caseNumber': case_number,
                  'id': comment_id
                },
                comment_id,
                function(response) {
                  deferred.resolve(response);
                },
                angular.bind(deferred, errorHandler)
              );

              return deferred.promise;
            }
          },
          notified_users: {
            add: function(caseNumber, ssoUserName) {
              var deferred = $q.defer();

              strata.cases.notified_users.add(
                caseNumber,
                ssoUserName,
                function (response) {
                  deferred.resolve(response);
                },
                angular.bind(deferred, errorHandler)
              );

              return deferred.promise;
            },
            remove: function(caseNumber, ssoUserName) {
              var deferred = $q.defer();

              strata.cases.notified_users.remove(
                caseNumber,
                ssoUserName,
                function (response) {
                  deferred.resolve(response);
                },
                angular.bind(deferred, errorHandler)
              );

              return deferred.promise;
            }
          },
          //cases.get
          get: function (id) {
            var deferred = $q.defer();

            strata.cases.get(
              id,
              function (response) {
                deferred.resolve(response);
              },
              angular.bind(deferred, errorHandler)
            );

            return deferred.promise;
          },
          //cases.filter
          filter: function (params) {
            var deferred = $q.defer();
            if (RHAUtils.isEmpty(params)) {
              params = {};
            }
            if (RHAUtils.isEmpty(params.count)) {
              params.count = 50;
            }

            strata.cases.filter(
              params,
              function (allCases) {
                deferred.resolve(allCases);
              },
              angular.bind(deferred, errorHandler)
            );

            return deferred.promise;
          },
          //cases.post
          post: function (caseJSON) {
            var deferred = $q.defer();

            strata.cases.post(
              caseJSON,
              function (caseNumber) {
                deferred.resolve(caseNumber);
              },
              angular.bind(deferred, errorHandler)
            );

            return deferred.promise;
          },
          //cases.put
          put: function (case_number, caseJSON) {
            var deferred = $q.defer();

            strata.cases.put(
              case_number,
              caseJSON,
              function (response) {
                deferred.resolve(response);
              },
              angular.bind(deferred, errorHandler)
            );

            return deferred.promise;
          }
        },
        values: {
          cases: {
            //values.cases.severity
            severity: function () {
              var deferred = $q.defer();

              strata.values.cases.severity(
                function (response) {
                  deferred.resolve(response);
                },
                angular.bind(deferred, errorHandler)
              );

              return deferred.promise;
            },
            //values.cases.status
            status: function () {
              var deferred = $q.defer();

              strata.values.cases.status(
                function (response) {
                  deferred.resolve(response);
                },
                angular.bind(deferred, errorHandler)
              );

              return deferred.promise;
            },
            //values.cases.types
            types: function () {
              var deferred = $q.defer();

              strata.values.cases.types(
                function (response) {
                  deferred.resolve(response);
                },
                angular.bind(deferred, errorHandler)
              );

              return deferred.promise;
            }
          }
        }
      };
    }
  ]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('AccountSelect', [
  '$scope',
  'strataService',
  'AlertService',
  'CaseService',
  'RHAUtils',
  function ($scope, strataService, AlertService, CaseService, RHAUtils) {

    $scope.CaseService = CaseService;

    $scope.selectUserAccount = function() {
      $scope.loadingAccountNumber = true;
      strataService.accounts.list().then(
        function(response) {
          $scope.loadingAccountNumber = false;
          CaseService.account.number = response;         
          $scope.populateAccountSpecificFields();
        },
        function(error) {
          $scope.loadingAccountNumber = false;
          AlertService.addStrataErrorMessage(error);
        });
    };

    $scope.alertInstance = null;
    $scope.populateAccountSpecificFields = function() {
      if (RHAUtils.isNotEmpty(CaseService.account.number)) {
        strataService.accounts.get(CaseService.account.number).then(
            function() {
              if (RHAUtils.isNotEmpty($scope.alertInstance)) {
                AlertService.removeAlert($scope.alertInstance);
              }
              CaseService.populateUsers();
            },
            function() {
              if (RHAUtils.isNotEmpty($scope.alertInstance)) {
                AlertService.removeAlert($scope.alertInstance);
              }
              $scope.alertInstance = AlertService.addWarningMessage('Account not found.');
            }
        );
      }
    };
  }
]);

'use strict';
/*global $ */


angular.module('RedhatAccess.cases')
.controller('AddCommentSection', [
  '$scope',
  'strataService',
  'CaseService',
  'AlertService',
  '$timeout',
  'RHAUtils',
  function ($scope, strataService, CaseService, AlertService, $timeout, RHAUtils) {
    $scope.CaseService = CaseService;

    $scope.addingComment = false;
    $scope.addComment = function() {
      $scope.addingComment = true;

      var onSuccess = function(response) {
        if(RHAUtils.isNotEmpty($scope.saveDraftPromise)) {
          $timeout.cancel($scope.saveDraftPromise);
        }

        CaseService.commentText = '';

        //TODO: find better way than hard code
        if(CaseService.kase.status.name === "Closed"){
          CaseService.kase.status.name = "Waiting on Red Hat";
        }

        CaseService.populateComments(CaseService.kase.case_number).then(
          function(comments) {
            $scope.addingComment = false;
            $scope.savingDraft = false;
            $scope.draftSaved = false;
            CaseService.draftComment = undefined;
            CaseService.refreshComments();
          }
        );
      };

      var onError = function(error) {
        AlertService.addStrataErrorMessage(error);
        $scope.addingComment = false;
      };

      if(RHAUtils.isNotEmpty(CaseService.draftComment)) {
        strataService.cases.comments.put(
          CaseService.kase.case_number, 
          CaseService.commentText, 
          false, 
          CaseService.draftComment.id)
            .then(onSuccess, onError);
      } else {
        strataService.cases.comments.post(
          CaseService.kase.case_number, 
          CaseService.commentText)
            .then(onSuccess, onError);
      }
    };

    $scope.saveDraftPromise;
    $scope.onNewCommentKeypress = function() {
      if(RHAUtils.isNotEmpty(CaseService.commentText) && !$scope.addingComment) {
        $timeout.cancel($scope.saveDraftPromise);
        $scope.saveDraftPromise = $timeout(function() {
          if (!$scope.addingComment) {
            $scope.saveDraft();
          }
        },
        5000);
      }
    };

    $scope.saveDraft = function() {
      $scope.savingDraft = true;

      var onSuccess = function(commentId) {
        $scope.savingDraft = false;
        $scope.draftSaved = true;

        CaseService.draftComment = {
          "text": CaseService.commentText,
          "id": RHAUtils.isNotEmpty(commentId) ? commentId : draftComment.id,
          "draft": true,
          "case_number": CaseService.kase.case_number
        };
      };

      var onFailure = function(error) {
        AlertService.addStrataErrorMessage(error);
        $scope.savingDraft = false;
      }

      if (RHAUtils.isNotEmpty(CaseService.draftComment)) {
        //draft update
        strataService.cases.comments.put(
          CaseService.kase.case_number, 
          CaseService.commentText, 
          true, 
          CaseService.draftComment.id)
            .then(onSuccess, onFailure);
      } else {
        //initial draft save
        strataService.cases.comments.post(
          CaseService.kase.case_number, 
          CaseService.commentText, 
          true)
            .then(onSuccess, onFailure);
      }
    };
  }
]);

'use strict';
/*global $ */


angular.module('RedhatAccess.cases')
.controller('AttachLocalFile', [
  '$scope',
  'AttachmentsService',
  'securityService',
  function ($scope, AttachmentsService, securityService) {
    $scope.NO_FILE_CHOSEN = 'No file chosen';
    $scope.fileDescription = '';

    $scope.clearSelectedFile = function() {
      $scope.fileName = $scope.NO_FILE_CHOSEN;
      $scope.fileDescription = '';
    };

    $scope.addFile = function() {
      /*jshint camelcase: false */
      var data = new FormData();
      data.append('file', $scope.fileObj);
      data.append('description', $scope.fileDescription);

      AttachmentsService.addNewAttachment({
        file_name: $scope.fileName,
        description: $scope.fileDescription,
        length: $scope.fileSize,
        created_by: securityService.loginStatus.loggedInUser,
        created_date: new Date().getTime(),
        file: data
      });

      $scope.clearSelectedFile();
    };

    $scope.getFile = function() {
      $('#fileUploader').click();
    };

    $scope.selectFile = function() {
      $scope.fileObj = $('#fileUploader')[0].files[0];
      $scope.fileSize = $scope.fileObj.size;
      $scope.fileName = $scope.fileObj.name;
      $scope.$apply();
    };

    $scope.clearSelectedFile();
  }
]);

'use strict';
/*jshint camelcase: false */
angular.module('RedhatAccess.cases')
  .controller('AttachmentsSection', [
    '$scope',
    'AttachmentsService',
    'CaseService',
    'TreeViewSelectorUtils',
    'EDIT_CASE_CONFIG',
    function (
      $scope,
      AttachmentsService,
      CaseService,
      TreeViewSelectorUtils,
      EDIT_CASE_CONFIG) {

      $scope.rhaDisabled = !EDIT_CASE_CONFIG.showAttachments;
      $scope.showServerSideAttachments = EDIT_CASE_CONFIG.showServerSideAttachments;
      $scope.AttachmentsService = AttachmentsService;
      $scope.CaseService = CaseService;
      $scope.TreeViewSelectorUtils = TreeViewSelectorUtils;

      $scope.doUpdate = function () {
        $scope.updatingAttachments = true;
        AttachmentsService.updateAttachments(CaseService.kase.case_number).then(
          function () {
            $scope.updatingAttachments = false;
          },
          function (error) {
            $scope.updatingAttachments = false;
          });
      };
    }
  ]);

'use strict';
angular.module('RedhatAccess.cases')
  .controller('BackEndAttachmentsCtrl', ['$scope', '$location', 'TreeViewSelectorData', 'AttachmentsService', 'NEW_CASE_CONFIG', 'EDIT_CASE_CONFIG',
    function ($scope, $location, TreeViewSelectorData, AttachmentsService, NEW_CASE_CONFIG, EDIT_CASE_CONFIG) {
      $scope.name = 'Attachments';
      $scope.attachmentTree = [];

      var newCase = false;
      var editCase = false;
      
      if($location.path().indexOf('new') > -1 ){
        newCase = true;
      } else{
        editCase = true;
      }
      if (!$scope.rhaDisabled && newCase && NEW_CASE_CONFIG.showServerSideAttachments || !$scope.rhaDisabled && editCase && EDIT_CASE_CONFIG.showServerSideAttachments) {
        var sessionId = $location.search().sessionId;
        TreeViewSelectorData.getTree('attachments', sessionId).then(
          function (tree) {
            $scope.attachmentTree = tree;
            AttachmentsService.updateBackEndAttachments(tree);
          },
          function () {
          });
      }
    }
  ]);

'use strict';

//Saleforce hack---
//we have to monitor stuff on the window object
//because the liveagent code generated by Salesforce is not
//designed for angularjs.
//We create fake buttons that we give to the salesforce api so we can track
//chat availability without having to write a complete rest client.
window.fakeOnlineButton = {
  style: {
    display: 'none'
  }
};

window.fakeOfflineButton = {
  style: {
    display: 'none'
  }
};
//

angular.module('RedhatAccess.cases')
  .controller('ChatButton', [
    '$scope',
    'CaseService',
    'securityService',
    'CHAT_SUPPORT',
    'securityService',
    'AUTH_EVENTS',
    '$rootScope',
    '$sce',
    '$http',
    '$interval',
    function ($scope, CaseService, SecurityService, CHAT_SUPPORT, securityService, AUTH_EVENTS, $rootScope, $sce, $http, $interval) {


      $scope.securityService = securityService;
      if (window.chatInitialized === undefined) {
        window.chatInitialized = false;
      }


      $scope.checkChatButtonStates = function () {
        $scope.chatAvailable = window.fakeOnlineButton.style.display !== 'none';
      };

      $scope.timer = null;


      $scope.chatHackUrl = $sce.trustAsResourceUrl(CHAT_SUPPORT.chatIframeHackUrlPrefix);

      $scope.setChatIframeHackUrl = function () {
        var url = CHAT_SUPPORT.chatIframeHackUrlPrefix + '?sessionId=' + securityService.loginStatus.sessionId + '&ssoName=' + securityService.loginStatus.ssoName;
        $scope.chatHackUrl = $sce.trustAsResourceUrl(url);

      };


      $scope.enableChat = function () {
        $scope.showChat = securityService.loginStatus.isLoggedIn && securityService.loginStatus.hasChat && CHAT_SUPPORT.enableChat;
        return $scope.showChat;

      };

      $scope.showChat = false; // determines whether we should show buttons at all

      $scope.chatAvailable = false; //Availability of chat as determined by live agent, toggles chat buttons

      $scope.initializeChat = function () {
        if (!$scope.enableChat() || window.chatInitialized === true) {
          //function should only be called when chat is enabled, and only once per page load
          return;
        }
        if (!window._laq) {
          window._laq = [];
        }
        window._laq.push(
          function () {
            liveagent.showWhenOnline(
              CHAT_SUPPORT.chatButtonToken,
              window.fakeOnlineButton);

            liveagent.showWhenOffline(
              CHAT_SUPPORT.chatButtonToken,
              window.fakeOfflineButton);
          }
        );
        //var chatToken = securityService.loginStatus.sessionId;
        var ssoName = securityService.loginStatus.ssoName;
        var name = securityService.loginStatus.loggedInUser;
        //var currentCaseNumber;
        var accountNumber = securityService.loginStatus.account.number;

        // if (currentCaseNumber) {
        //   liveagent
        //     .addCustomDetail('Case Number', currentCaseNumber)
        //     .map('Case', 'CaseNumber', false, false, false)
        //     .saveToTranscript('CaseNumber__c');
        // }

        // if (chatToken) {
        //   liveagent
        //     .addCustomDetail('Session ID', chatToken)
        //     .map('Contact', 'SessionId__c', false, false, false);
        // }

        liveagent
          .addCustomDetail('Contact Login', ssoName)
          .map('Contact', 'SSO_Username__c', true, true, true)
          .saveToTranscript('SSO_Username__c');
        //liveagent
        //  .addCustomDetail('Contact E-mail', email)
        //  .map('Contact', 'Email', false, false, false);
        liveagent
          .addCustomDetail('Account Number', accountNumber)
          .map('Account', 'AccountNumber', true, true, true);
        liveagent.setName(name);
        liveagent.addCustomDetail('Name', name);
        liveagent.setChatWindowHeight('552');
        //liveagent.enableLogging();

        liveagent.init(
          CHAT_SUPPORT.chatLiveAgentUrlPrefix,
          CHAT_SUPPORT.chatInitHashOne,
          CHAT_SUPPORT.chatInitHashTwo);
        window.chatInitialized = true;
      };

      $scope.openChatWindow = function () {
        liveagent.startChat(CHAT_SUPPORT.chatButtonToken);
      };



      $scope.init = function () {

        if ($scope.enableChat()) {
          $scope.setChatIframeHackUrl();
          $scope.timer = $interval($scope.checkChatButtonStates, 5000);
          $scope.initializeChat();

        }
      };

      $scope.$on(
        '$destroy',
        function () {
          //we cancel timer each time scope is destroyed
          //it will be restarted via init on state change to a page that has a chat buttom
          $interval.cancel($scope.timer);
        }
      );

      if (securityService.loginStatus.isLoggedIn) {
        $scope.init();
      } else {
        $rootScope.$on(AUTH_EVENTS.loginSuccess, function () {
          $scope.init();
        });
      }

      $rootScope.$on(AUTH_EVENTS.sessionIdChanged, function () {
        if ($scope.enableChat()) {
          $scope.setChatIframeHackUrl();
        }
      });

    }
  ]);
'use strict';
 /*jshint unused:vars */
 /*jshint camelcase: false */

angular.module('RedhatAccess.cases')
.controller('CommentsSection', [
  '$scope',
  'CaseService',
  'strataService',
  '$stateParams',
  'AlertService',
  '$timeout',
  '$modal',
  'RHAUtils',
  function(
      $scope,
      CaseService,
      strataService,
      $stateParams,
      AlertService,
      $timeout,
      $modal,
      RHAUtils) {
    $scope.CaseService = CaseService;

    CaseService.refreshComments = function() {
      $scope.selectPage(1);
    };

    CaseService.populateComments($stateParams.id).then(
      function(comments) {
        if (RHAUtils.isNotEmpty(comments)) {
          CaseService.refreshComments();
        }
      }
    );

    $scope.itemsPerPage = 4;
    $scope.maxPagerSize = 3;

    $scope.selectPage = function(pageNum) {
      var start = $scope.itemsPerPage * (pageNum - 1);
      var end = start + $scope.itemsPerPage;
      end = end > CaseService.comments.length ?
          CaseService.comments.length : end;

      $scope.commentsOnScreen =
          CaseService.comments.slice(start, end);
    };

    $scope.requestManagementEscalation = function() {
      $modal.open({
        templateUrl: 'cases/views/requestManagementEscalationModal.html',
        controller: 'RequestManagementEscalationModal'
      });
    };

    if (RHAUtils.isNotEmpty(CaseService.comments)) {
      CaseService.refreshComments();
    }
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
  .controller('CompactCaseList', [
    '$scope',
    '$stateParams',
    'strataService',
    'CaseService',
    '$rootScope',
    'AUTH_EVENTS',
    'securityService',
    'SearchCaseService',
    'AlertService',
    'SearchBoxService',
    'RHAUtils',
    '$filter',
    function (
      $scope,
      $stateParams,
      strataService,
      CaseService,
      $rootScope,
      AUTH_EVENTS,
      securityService,
      SearchCaseService,
      AlertService,
      SearchBoxService,
      RHAUtils,
      $filter) {

      $scope.securityService = securityService;
      $scope.CaseService = CaseService;
      $scope.selectedCaseIndex = -1;
      $scope.SearchCaseService = SearchCaseService;

      $scope.selectCase = function ($index) {
        if ($scope.selectedCaseIndex !== $index) {
          $scope.selectedCaseIndex = $index;
        }
      };

      $scope.domReady = false; //used to notify resizable directive that the page has loaded

      SearchBoxService.doSearch =
        CaseService.onSelectChanged =
        CaseService.onOwnerSelectChanged =
        CaseService.onGroupSelectChanged = function () {
          SearchCaseService.doFilter().then(
            function () {
              if (RHAUtils.isNotEmpty($stateParams.id) && $scope.selectedCaseIndex === -1) {
                var selectedCase =
                  $filter('filter')(
                    SearchCaseService.cases, {
                      'case_number': $stateParams.id
                    });
                $scope.selectedCaseIndex = SearchCaseService.cases.indexOf(selectedCase[0]);
              }

              $scope.domReady = true;
            }
          );
      };

      if (securityService.loginStatus.isLoggedIn) {
        CaseService.populateGroups();
        SearchBoxService.doSearch();
      }

      $rootScope.$on(AUTH_EVENTS.loginSuccess, function () {
        CaseService.populateGroups();
        SearchBoxService.doSearch();
        AlertService.clearAlerts();
      });

    }
  ]);
'use strict';

angular.module('RedhatAccess.cases')
  .controller('CompactEdit', [
    '$scope',
    'strataService',
    '$stateParams',
    'CaseService',
    'AttachmentsService',
    '$rootScope',
    'AUTH_EVENTS',
    'CASE_EVENTS',
    'securityService',
    'AlertService',
    function (
      $scope,
      strataService,
      $stateParams,
      CaseService,
      AttachmentsService,
      $rootScope,
      AUTH_EVENTS,
      CASE_EVENTS,
      securityService,
      AlertService) {

      $scope.securityService = securityService;

      $scope.caseLoading = true;
      $scope.domReady = false;

      $scope.init = function () {
        strataService.cases.get($stateParams.id).then(
          function (caseJSON) {
            CaseService.defineCase(caseJSON);
            $rootScope.$broadcast(CASE_EVENTS.received);
            $scope.caseLoading = false;

            if (caseJSON.product !== null && caseJSON.product.name !== null) {
              strataService.products.versions(caseJSON.product.name).then(
                function (versions) {
                  CaseService.versions = versions;
                },
                function (error) {
                  AlertService.addStrataErrorMessage(error);
                }
              );
            }
            $scope.domReady = true;
          }
        );

        strataService.cases.attachments.list($stateParams.id).then(
          function (attachmentsJSON) {
            AttachmentsService.defineOriginalAttachments(attachmentsJSON);
          },
          function (error) {
            AlertService.addStrataErrorMessage(error);
          }
        );
      };


      if (securityService.loginStatus.isLoggedIn) {
        $scope.init();
      }
      $rootScope.$on(AUTH_EVENTS.loginSuccess, function () {
        $scope.init();
        AlertService.clearAlerts();
      });
    }
  ]);
'use strict';
/*global $ */

angular.module('RedhatAccess.cases')
.controller('CreateGroupButton', [
  '$scope',
  '$modal',
  function ($scope, $modal) {
    $scope.openCreateGroupDialog = function() {
      $modal.open({
        templateUrl: 'cases/views/createGroupModal.html',
        controller: 'CreateGroupModal'
      });
    }
  }
]);

'use strict';
/*global $ */

angular.module('RedhatAccess.cases')
.controller('CreateGroupModal', [
  '$scope',
  '$modalInstance',
  'strataService',
  'AlertService',
  'CaseService',
  'GroupService',
  function ($scope, $modalInstance, strataService, AlertService, CaseService, GroupService) {

    $scope.createGroup = function() {
      AlertService.addWarningMessage('Creating group ' + this.groupName + '...');
      $modalInstance.close();

      strataService.groups.create(this.groupName).then(
        angular.bind(this, function(success) {
          CaseService.groups.push({
            name: this.groupName,
            number: success
          });

          AlertService.clearAlerts();
          AlertService.addSuccessMessage('Successfully created group ' + this.groupName);
          GroupService.reloadTable();
        }),
        function(error) {
          AlertService.clearAlerts();
          AlertService.addStrataErrorMessage(error);
        }
      );

    };

    $scope.closeModal = function() {
      $modalInstance.close();
    };   

    $scope.onGroupNameKeyPress = function($event) {
      if ($event.keyCode === 13) {
        angular.bind(this, $scope.createGroup)();
      }
    }
  }
]);

'use strict';
/*global $ */

angular.module('RedhatAccess.cases')
.controller('DeleteGroupButton', [
  '$scope',
  'strataService',
  'AlertService',
  'CaseService',
  '$q',
  '$filter',
  'GroupService',
  function ($scope, strataService, AlertService, CaseService, $q, $filter, GroupService) {

    $scope.deleteGroups = function() {
      var promises = [];
      angular.forEach(CaseService.groups, function(group, index) {
        if (group.selected) {
          var promise = strataService.groups.remove(group.number);
          promise.then(
            function(success) {
              var groups =
                  $filter('filter')(
                      CaseService.groups,
                      function(g) {
                        if (g.number !== group.number) {
                          return true;
                        } else {
                          return false;
                        }
                      });
              CaseService.groups = groups;
              GroupService.reloadTable();
              AlertService.addSuccessMessage('Successfully deleted group ' + group.name);
            },
            function(error) {
              AlertService.addStrataErrorMessage(error);
            }
          );
          promises.push(promise);
        }
      });

      AlertService.addWarningMessage('Deleting groups...');
      var parentPromise = $q.all(promises);
      parentPromise.then(
        function(success) {
          AlertService.clearAlerts();
          AlertService.addSuccessMessage('Successfully deleted groups.');
        },
        function(error) {
          AlertService.addStrataErrorMessage(error);
        }
      );
    }
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('DescriptionSection', [
  '$scope',
  'CaseService',
  function(
      $scope,
      CaseService) {

    $scope.CaseService = CaseService;
  }
]);

'use strict';
 /*jshint camelcase: false */
angular.module('RedhatAccess.cases')
.controller('DetailsSection', [
  '$scope',
  'strataService',
  'CaseService',
  '$rootScope',
  'AUTH_EVENTS',
  'CASE_EVENTS',
  'AlertService',
  'RHAUtils',
  function(
      $scope,
      strataService,
      CaseService,
      $rootScope,
      AUTH_EVENTS,
      CASE_EVENTS,
      AlertService,
      RHAUtils) {

    $scope.CaseService = CaseService;

    $scope.init = function() {
      if (!$scope.compact) {

        strataService.values.cases.types().then(
            function(response) {
              $scope.caseTypes = response;
            },
            function(error) {
              AlertService.addStrataErrorMessage(error);
            }
        );

        strataService.groups.list(CaseService.kase.contact_sso_username).then(
            function(response) {
              $scope.groups = response;
            },
            function(error) {
              AlertService.addStrataErrorMessage(error);
            }
        );
      }

      strataService.values.cases.status().then(
          function(response) {
            $scope.statuses = response;
          },
          function(error) {
            AlertService.addStrataErrorMessage(error);
          }
      );

      strataService.values.cases.severity().then(
          function(response) {
            CaseService.severities = response;
          },
          function(error) {
            AlertService.addStrataErrorMessage(error);
          }
      );

      strataService.products.list().then(
          function(response) {
            $scope.products = response;
          },
          function(error) {
            AlertService.addStrataErrorMessage(error);
          }
      );
    };

    $scope.updatingDetails = false;
    $scope.updateCase = function() {
      $scope.updatingDetails = true;

      var caseJSON = {};
      if (CaseService.kase != null) {
        if (CaseService.kase.type != null) {
          caseJSON.type = CaseService.kase.type.name;
        }
        if (CaseService.kase.severity != null) {
          caseJSON.severity = CaseService.kase.severity.name;
        }
        if (CaseService.kase.status != null) {
          caseJSON.status = CaseService.kase.status.name;
        }
        if (CaseService.kase.alternate_id != null) {
          caseJSON.alternateId = CaseService.kase.alternate_id;
        }
        if (CaseService.kase.product != null) {
          caseJSON.product = CaseService.kase.product.name;
        }
        if (CaseService.kase.version != null) {
          caseJSON.version = CaseService.kase.version;
        }
        if (CaseService.kase.summary != null) {
          caseJSON.summary = CaseService.kase.summary;
        }
        if (CaseService.kase.group != null) {
          caseJSON.folderNumber = CaseService.kase.group.number;
        }
        if (RHAUtils.isNotEmpty(CaseService.kase.fts)) {
          caseJSON.fts = CaseService.kase.fts;
          if (!CaseService.kase.fts) {
            caseJSON.contactInfo24X7 = '';
          }
        }
        if (CaseService.kase.fts && RHAUtils.isNotEmpty(CaseService.kase.contact_info24_x7)) {
          caseJSON.contactInfo24X7 = CaseService.kase.contact_info24_x7;
        }

        strataService.cases.put(CaseService.kase.case_number, caseJSON).then(
            function() {
              $scope.caseDetails.$setPristine();
              $scope.updatingDetails = false;
              if ($scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') {
                $scope.$apply();
              }
            },
            function(error) {
              AlertService.addStrataErrorMessage(error);
              $scope.updatingDetails = false;
              $scope.$apply();
            }
        );
      }
    };

    $scope.getProductVersions = function() {
      CaseService.versions = [];

      strataService.products.versions(CaseService.kase.product.code).then(
          function(versions){
            CaseService.versions = versions;
          },
          function(error) {
            AlertService.addStrataErrorMessage(error);
          }
      );
    };

    $rootScope.$on(CASE_EVENTS.received, function() {
      $scope.init();
      AlertService.clearAlerts();
    });
  }
]);

'use strict';
/*jshint camelcase: false */
angular.module('RedhatAccess.cases')
  .controller('Edit', [
    '$scope',
    '$stateParams',
    '$filter',
    '$q',
    'AttachmentsService',
    'CaseService',
    'strataService',
    'RecommendationsService',
    '$rootScope',
    'AUTH_EVENTS',
    'AlertService',
    'securityService',
    'EDIT_CASE_CONFIG',
    'RHAUtils',
    'CASE_EVENTS',
    function (
      $scope,
      $stateParams,
      $filter,
      $q,
      AttachmentsService,
      CaseService,
      strataService,
      RecommendationsService,
      $rootScope,
      AUTH_EVENTS,
      AlertService,
      securityService,
      EDIT_CASE_CONFIG,
      RHAUtils,
      CASE_EVENTS) {

      $scope.EDIT_CASE_CONFIG = EDIT_CASE_CONFIG;
      $scope.securityService = securityService;
      $scope.AttachmentsService = AttachmentsService;
      $scope.CaseService = CaseService;
      CaseService.clearCase();

      $scope.init = function () {
        $scope.caseLoading = true;
        $scope.recommendationsLoading = true;

        strataService.cases.get($stateParams.id).then(
          function (caseJSON) {
            CaseService.defineCase(caseJSON);
            $rootScope.$broadcast(CASE_EVENTS.received);
            $scope.caseLoading = false;

            if ('product' in caseJSON && 'name' in caseJSON.product && caseJSON.product.name) {
              strataService.products.versions(caseJSON.product.name).then(
                function (versions) {
                  CaseService.versions = versions;
                },
                function (error) {
                  AlertService.addStrataErrorMessage(error);
                }
              );
            }

            if (caseJSON.account_number !== undefined) {
              strataService.accounts.get(caseJSON.account_number).then(
                function (account) {
                  CaseService.defineAccount(account);
                },
                function (error) {
                  AlertService.addStrataErrorMessage(error);
                }
              );
            }

            if (EDIT_CASE_CONFIG.showRecommendations) {
              RecommendationsService.populatePinnedRecommendations().then(
                function () {
                  $scope.recommendationsLoading = false;
                },
                function (error) {
                  AlertService.addStrataErrorMessage(error);
                }
              );

              RecommendationsService.populateRecommendations(12).then(
                function () {
                  $scope.recommendationsLoading = false;
                }
              );
            }

            if (EDIT_CASE_CONFIG.showEmailNotifications) {
              CaseService.defineNotifiedUsers();
            }
          }
        );

        if (EDIT_CASE_CONFIG.showAttachments) {
          $scope.attachmentsLoading = true;
          strataService.cases.attachments.list($stateParams.id).then(
            function (attachmentsJSON) {
              AttachmentsService.defineOriginalAttachments(attachmentsJSON);
              $scope.attachmentsLoading = false;
            },
            function (error) {
              AlertService.addStrataErrorMessage(error);
            }
          );
        }

        if (EDIT_CASE_CONFIG.showComments) {
          $scope.commentsLoading = true;
          strataService.cases.comments.get($stateParams.id).then(
            function (commentsJSON) {
              $scope.comments = commentsJSON;
              $scope.commentsLoading = false;
            },
            function (error) {
              AlertService.addStrataErrorMessage(error);
            }
          );
        }
      };

      if (securityService.loginStatus.isLoggedIn) {
        $scope.init();
      }
      $rootScope.$on(AUTH_EVENTS.loginSuccess, function () {
        $scope.init();
        AlertService.clearAlerts();
      });
    }
  ]);
'use strict';

angular.module('RedhatAccess.cases')
  .controller('EmailNotifySelect', [
    '$scope',
    '$rootScope',
    'CaseService',
    'securityService',
    'AlertService',
    'strataService',
    '$filter',
    'RHAUtils',
    'EDIT_CASE_CONFIG',
    'AUTH_EVENTS',
    function ($scope, $rootScope, CaseService, securityService, AlertService, strataService, $filter, RHAUtils, EDIT_CASE_CONFIG, AUTH_EVENTS) {

      $scope.securityService = securityService;
      $scope.CaseService = CaseService;
      $scope.showEmailNotifications = EDIT_CASE_CONFIG.showEmailNotifications;

      $scope.updateNotifyUsers = function () {
        if (!angular.equals(CaseService.updatedNotifiedUsers, CaseService.originalNotifiedUsers)) {

          angular.forEach(CaseService.originalNotifiedUsers, function (origUser) {
            var updatedUser = $filter('filter')(CaseService.updatedNotifiedUsers, origUser);

            if (RHAUtils.isEmpty(updatedUser)) {
              $scope.updatingList = true;
              strataService.cases.notified_users.remove(CaseService.kase.case_number, origUser).then(
                function () {
                  $scope.updatingList = false;
                  CaseService.originalNotifiedUsers = CaseService.updatedNotifiedUsers;
                },
                function (error) {
                  $scope.updatingList = false;
                  AlertService.addStrataErrorMessage(error);
                });
            }
          });

          angular.forEach(CaseService.updatedNotifiedUsers, function (updatedUser) {
            var originalUser = $filter('filter')(CaseService.originalNotifiedUsers, updatedUser);

            if (RHAUtils.isEmpty(originalUser)) {
              $scope.updatingList = true;
              strataService.cases.notified_users.add(CaseService.kase.case_number, updatedUser).then(
                function () {
                  CaseService.originalNotifiedUsers = CaseService.updatedNotifiedUsers;
                  $scope.updatingList = false;
                },
                function (error) {
                  $scope.updatingList = false;
                  AlertService.addStrataErrorMessage(error);
                });
            }
          });
        }
      };
      if (securityService.loginStatus.isLoggedIn) {
        CaseService.populateUsers();
      }
      $rootScope.$on(AUTH_EVENTS.loginSuccess, function () {
        CaseService.populateUsers();
      });
    }
  ]);
'use strict';

angular.module('RedhatAccess.cases')
.controller('EntitlementSelect', [
  '$scope',
  'strataService',
  'AlertService',
  '$filter',
  'RHAUtils',
  'CaseService',
  function ($scope, strataService, AlertService, $filter, RHAUtils, CaseService) {

    $scope.CaseService = CaseService;
    CaseService.populateEntitlements();
  }
]);

'use strict';
 /*jshint camelcase: false */
angular.module('RedhatAccess.cases')
.controller('ExportCSVButton', [
  '$scope',
  'strataService',
  'AlertService',
  function(
      $scope,
      strataService,
      AlertService) {

    $scope.exporting = false;

    $scope.exports = function() {
      $scope.exporting = true;
      strataService.cases.csv().then(
        function(response) {
          $scope.exporting = false;
        },
        function(error) {
          AlertService.addStrataErrorMessage(error);
        }
      );
    };
  }
]);

'use strict';
 /*jshint camelcase: false */
angular.module('RedhatAccess.cases')
.controller('Group', [
  '$scope',
  'securityService',
  'SearchBoxService',
  'GroupService',
  function(
      $scope,
      securityService,
      SearchBoxService,
      GroupService) {

    $scope.securityService = securityService;

    SearchBoxService.onChange = SearchBoxService.doSearch = SearchBoxService.onKeyPress = function() {
      GroupService.reloadTable();
    };
  }
]);

'use strict';
/*global $ */

angular.module('RedhatAccess.cases')
.controller('GroupList', [
  '$scope',
  'strataService',
  'AlertService',
  'CaseService',
  '$filter',
  'ngTableParams',
  'GroupService',
  'SearchBoxService',
  function ($scope, strataService, AlertService, CaseService, $filter, ngTableParams, GroupService, SearchBoxService) {

    $scope.CaseService = CaseService;
    $scope.GroupService = GroupService;
    $scope.listEmpty = false;
    $scope.groupsOnScreen = [];

    var tableBuilt = false;
    var buildTable = function() {
      $scope.tableParams = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {
          name: 'asc'
        }
      }, {
        total: CaseService.groups.length,
        getData: function($defer, params) {
          var orderedData = $filter('filter')(CaseService.groups, SearchBoxService.searchTerm);

          orderedData = params.sorting() ?
              $filter('orderBy')(orderedData, params.orderBy()) : orderedData;
          
          orderedData.length < 1 ? $scope.listEmpty = true : $scope.listEmpty = false;

          var pageData = orderedData.slice(
              (params.page() - 1) * params.count(), params.page() * params.count());

          $scope.tableParams.total(orderedData.length);
          GroupService.groupsOnScreen = pageData;
          $defer.resolve(pageData);
        }
      });

      GroupService.reloadTable = function() {
        $scope.tableParams.reload();
      };
      tableBuilt = true;
    };

    $scope.groupsLoading = true;
    strataService.groups.list().then(
      function(groups) {
        CaseService.groups = groups;
        buildTable();
        $scope.groupsLoading = false;
      },
      function(error) {
        AlertService.addStrataErrorMessage(error);
      }
    );

    $scope.onMasterCheckboxClicked = function() {
      for(var i = 0; i < GroupService.groupsOnScreen.length; i++) {
        if (this.masterSelected) {
          GroupService.groupsOnScreen[i].selected = true;
        } else {
          GroupService.groupsOnScreen[i].selected = false;
        }
      };
    }

    CaseService.clearCase();
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.constant('CASE_GROUPS', {
  manage: 'manage',
  ungrouped: 'ungrouped'
})
.controller('GroupSelect', [
  '$scope',
  'securityService',
  'SearchCaseService',
  'CaseService',
  'strataService',
  'AlertService',
  'CASE_GROUPS',
  function (
    $scope,
    securityService,
    SearchCaseService,
    CaseService,
    strataService,
    AlertService,
    CASE_GROUPS) {

    $scope.securityService = securityService;
    $scope.SearchCaseService = SearchCaseService;
    $scope.CaseService = CaseService;
    $scope.CASE_GROUPS = CASE_GROUPS;

    CaseService.populateGroups();
  }
]);

'use strict';
/*jshint camelcase: false */
angular.module('RedhatAccess.cases')
  .controller('List', [
    '$scope',
    '$filter',
    'ngTableParams',
    'securityService',
    'AlertService',
    '$rootScope',
    'SearchCaseService',
    'CaseService',
    'AUTH_EVENTS',
    'SearchBoxService',
    function ($scope,
      $filter,
      ngTableParams,
      securityService,
      AlertService,
      $rootScope,
      SearchCaseService,
      CaseService,
      AUTH_EVENTS,
      SearchBoxService) {
      $scope.SearchCaseService = SearchCaseService;
      $scope.securityService = securityService;
      $scope.AlertService = AlertService;
      AlertService.clearAlerts();

      var tableBuilt = false;

      var buildTable = function () {
        /*jshint newcap: false*/
        $scope.tableParams = new ngTableParams({
          page: 1,
          count: 10,
          sorting: {
            last_modified_date: 'desc'
          }
        }, {
          total: SearchCaseService.cases.length,
          getData: function ($defer, params) {
            if(!SearchCaseService.allCasesDownloaded && ((params.count() * params.page()) / SearchCaseService.total >= .8)){
              SearchCaseService.doFilter().then(
                function () {
                  $scope.tableParams.reload();
                  var orderedData = params.sorting() ?
                    $filter('orderBy')(SearchCaseService.cases, params.orderBy()) : SearchCaseService.cases;

                  var pageData = orderedData.slice(
                    (params.page() - 1) * params.count(), params.page() * params.count());

                  $scope.tableParams.total(orderedData.length);
                  $defer.resolve(pageData);
                }
              );
            } else {
              var orderedData = params.sorting() ?
                $filter('orderBy')(SearchCaseService.cases, params.orderBy()) : SearchCaseService.cases;

              var pageData = orderedData.slice(
                (params.page() - 1) * params.count(), params.page() * params.count());

              $scope.tableParams.total(orderedData.length);
              $defer.resolve(pageData);
            }
          }
        });

        tableBuilt = true;
      };

      SearchBoxService.doSearch =
        CaseService.onSelectChanged =
        CaseService.onOwnerSelectChanged =
        CaseService.onGroupSelectChanged = function () {
          SearchCaseService.doFilter().then(
            function () {
              if (!tableBuilt) {
                buildTable();
              } else {
                $scope.tableParams.reload();
              }
            }
          );
      };

      /**
       * Callback after user login. Load the cases and clear alerts
       */

      if (securityService.loginStatus.isLoggedIn) {
        SearchCaseService.clear();
        SearchBoxService.doSearch();
      }
      $rootScope.$on(AUTH_EVENTS.loginSuccess, function () {
        SearchBoxService.doSearch();
        AlertService.clearAlerts();
      });
    }
  ]);
'use strict';

angular.module('RedhatAccess.cases')
.controller('ListAttachments', [
  '$scope',
  'AttachmentsService',
  function ($scope, AttachmentsService) {

    $scope.AttachmentsService = AttachmentsService;
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('ListBugzillas', [
  '$scope',
  'CaseService',
  'securityService',
  function (
	  	$scope,
	    CaseService,
	    securityService) {

  	$scope.CaseService = CaseService;
  	$scope.securityService = securityService;
  }
    
]);
'use strict';
 /*jshint camelcase: false */
angular.module('RedhatAccess.cases')
.controller('ListFilter', [
  '$scope',
  'STATUS',
  'CaseService',
  'securityService',
  function ($scope,
            STATUS,
            CaseService,
            securityService) {

    $scope.securityService = securityService;
    CaseService.status = STATUS.both;
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
  .controller('ListNewAttachments', [
    '$scope',
    'AttachmentsService',
    'TreeViewSelectorUtils',
    function($scope, AttachmentsService, TreeViewSelectorUtils) {
      $scope.AttachmentsService = AttachmentsService;
      $scope.TreeViewSelectorUtils = TreeViewSelectorUtils;

      $scope.removeLocalAttachment = function($index) {
        AttachmentsService.removeUpdatedAttachment($index);
      };
    }
  ]);
'use strict';

angular.module('RedhatAccess.cases')
  .controller('New', [
    '$scope',
    '$state',
    '$q',
    'SearchResultsService',
    'AttachmentsService',
    'strataService',
    'RecommendationsService',
    'CaseService',
    'AlertService',
    'securityService',
    '$rootScope',
    'AUTH_EVENTS',
    '$location',
    'RHAUtils',
    'NEW_DEFAULTS',
    'NEW_CASE_CONFIG',
    function ($scope,
      $state,
      $q,
      SearchResultsService,
      AttachmentsService,
      strataService,
      RecommendationsService,
      CaseService,
      AlertService,
      securityService,
      $rootScope,
      AUTH_EVENTS,
      $location,
      RHAUtils,
      NEW_DEFAULTS,
      NEW_CASE_CONFIG) {

      $scope.NEW_CASE_CONFIG = NEW_CASE_CONFIG;
      $scope.versions = [];
      $scope.versionDisabled = true;
      $scope.versionLoading = false;
      $scope.incomplete = true;
      $scope.submitProgress = 0;
      AttachmentsService.clear();
      CaseService.clearCase();
      RecommendationsService.clear();
      SearchResultsService.clear();
      AlertService.clearAlerts();

      $scope.CaseService = CaseService;
      $scope.RecommendationsService = RecommendationsService;
      $scope.securityService = securityService;

      $scope.getRecommendations = function () {
        if ($scope.NEW_CASE_CONFIG.showRecommendations) {
          SearchResultsService.searchInProgress.value = true;
          RecommendationsService.populateRecommendations(5).then(
            function () {
              SearchResultsService.clear();

              RecommendationsService.recommendations.forEach(
                function (recommendation) {
                  SearchResultsService.add(recommendation);
                }
              );
              SearchResultsService.searchInProgress.value = false;
            },
            function (error) {
              AlertService.addStrataErrorMessage(error);
            }
          );
        }
      };

      CaseService.onOwnerSelectChanged = function () {
        if (CaseService.owner != null) {
          CaseService.populateEntitlements(CaseService.owner);
          CaseService.populateGroups(CaseService.owner);
        }

        CaseService.validateNewCasePage1();
      };

      /**
       * Populate the selects
       */
      $scope.initSelects = function () {
        $scope.productsLoading = true;
        strataService.products.list().then(
          function (products) {
            $scope.products = products;
            $scope.productsLoading = false;

            if (RHAUtils.isNotEmpty(NEW_DEFAULTS.product)) {
              CaseService.kase.product = {
              name: NEW_DEFAULTS.product,
              code: NEW_DEFAULTS.product
            };
            $scope.getRecommendations();
            $scope.getProductVersions(CaseService.kase.product);
            }
          },
          function (error) {
            AlertService.addStrataErrorMessage(error);
          }
        );

        $scope.severitiesLoading = true;
        strataService.values.cases.severity().then(
          function (severities) {
            CaseService.severities = severities;
            CaseService.kase.severity = severities[severities.length - 1];
          $scope.severitiesLoading = false;
          },
          function (error) {
            AlertService.addStrataErrorMessage(error);
          }
        );

        $scope.groupsLoading = true;
        strataService.groups.list().then(
          function (groups) {
            /*jshint camelcase: false*/
            CaseService.groups = groups;
            for (var i = 0; i < groups.length; i++) {
              if (groups[i].is_default) {
                CaseService.kase.group = groups[i];
              break;
              }
            }
            $scope.groupsLoading = false;
          },
          function (error) {
            AlertService.addStrataErrorMessage(error);
          }
        );
      };

      $scope.initDescription = function () {
        var searchObject = $location.search();

        var setDesc = function (desc) {
          CaseService.kase.description = desc;
        $scope.getRecommendations();
        };

        if (searchObject.data) {
          setDesc(searchObject.data);
        } else {
          //angular does not  handle params before hashbang
          //@see https://github.com/angular/angular.js/issues/6172
          var queryParamsStr = window.location.search.substring(1);
          var parameters = queryParamsStr.split('&');
          for (var i = 0; i < parameters.length; i++) {
            var parameterName = parameters[i].split('=');
            if (parameterName[0] === 'data') {
              setDesc(decodeURIComponent(parameterName[1]));
            }
          }
        }
      };

      if (securityService.loginStatus.isLoggedIn) {
        $scope.initSelects();
        $scope.initDescription();
      }

      $rootScope.$on(AUTH_EVENTS.loginSuccess, function () {
        $scope.initSelects();
        $scope.initDescription();
        AlertService.clearAlerts();
      });


      /**
       * Retrieve product's versions from strata
       *
       * @param product
       */
      $scope.getProductVersions = function (product) {
        CaseService.kase.version = '';
      $scope.versionDisabled = true;
      $scope.versionLoading = true;

      strataService.products.versions(product.code).then(
        function (response) {
          $scope.versions = response;
          CaseService.validateNewCasePage1();
          $scope.versionDisabled = false;
          $scope.versionLoading = false;

          if (RHAUtils.isNotEmpty(NEW_DEFAULTS.version)) {
            CaseService.kase.version = NEW_DEFAULTS.version;
          $scope.getRecommendations();
          }
        },
        function (error) {
          AlertService.addStrataErrorMessage(error);
        }
      );
      };

      /**
       * Go to a page in the wizard
       *
       * @param page
       */
      $scope.gotoPage = function (page) {
        $scope.isPage1 = page === 1 ? true : false;
        $scope.isPage2 = page === 2 ? true : false;
      };

      /**
       * Navigate forward in the wizard
       */
      $scope.doNext = function () {
        $scope.gotoPage(2);
      };

      /**
       * Navigate back in the wizard
       */
      $scope.doPrevious = function () {
        $scope.gotoPage(1);
      };


      $scope.submittingCase = false;
      /**
       * Create the case with attachments
       */
      $scope.doSubmit = function ($event) {
        if(window.portal){
          chrometwo_require(['analytics/main'], function (analytics) {
             analytics.trigger('OpenSupportCaseSubmit', $event);
          });
        }

        /*jshint camelcase: false */
        var caseJSON = {
          'product': CaseService.kase.product.code,
        'version':
          CaseService.kase.version,
        'summary':
          CaseService.kase.summary,
        'description':
          CaseService.kase.description,
        'severity':
          CaseService.kase.severity.name,
        };

        if (RHAUtils.isNotEmpty(CaseService.group)) {
          caseJSON.folderNumber = CaseService.group;
        }

        if (RHAUtils.isNotEmpty(CaseService.entitlement)) {
          caseJSON.entitlement = {};
          caseJSON.entitlement.sla = CaseService.entitlement;
        }

        if (RHAUtils.isNotEmpty(CaseService.account)) {
          caseJSON.accountNumber = CaseService.account.number;
        }

        if (CaseService.fts) {
          caseJSON.fts = true;
          if (CaseService.fts_contact) {
            caseJSON.contactInfo24X7 = CaseService.fts_contact;
          }
        }

        if (RHAUtils.isNotEmpty(CaseService.owner)) {
          caseJSON.contactSsoUsername = CaseService.owner;
        }

        $scope.submittingCase = true;
        AlertService.addWarningMessage('Creating case...');

        var redirectToCase = function (caseNumber) {
          $state.go('edit', {
            id: caseNumber
          });
          AlertService.clearAlerts();
          $scope.submittingCase = false;
        };

        strataService.cases.post(caseJSON).then(
          function (caseNumber) {
            AlertService.clearAlerts();
            AlertService.addSuccessMessage('Successfully created case number ' + caseNumber);
            if ((AttachmentsService.updatedAttachments.length > 0 || AttachmentsService.hasBackEndSelections()) &&
              NEW_CASE_CONFIG.showAttachments) {

              AttachmentsService.updateAttachments(caseNumber).then(
                function () {
                  redirectToCase(caseNumber);
                });
            } else {
              redirectToCase(caseNumber);
            }
          },
          function (error) {
            AlertService.addStrataErrorMessage(error);
          }
        );
      };

      $scope.gotoPage(1);
    }
  ]);
'use strict';

angular.module('RedhatAccess.cases')
  .controller('OwnerSelect', [
    '$scope',
    '$rootScope',
    'securityService',
    'AUTH_EVENTS',
    'SearchCaseService',
    'CaseService',
    function (
      $scope,
      $rootScope,
      securityService,
      AUTH_EVENTS,
      SearchCaseService,
      CaseService) {

      $scope.securityService = securityService;
      $scope.SearchCaseService = SearchCaseService;
      $scope.CaseService = CaseService;
      if (securityService.loginStatus.isLoggedIn) {
        CaseService.populateUsers();
      }
      $rootScope.$on(AUTH_EVENTS.loginSuccess, function () {
        CaseService.populateUsers();
      });
    }
  ]);
'use strict';

angular.module('RedhatAccess.cases')
.controller('ProductSelect', [
  '$scope',
  'securityService',
  'SearchCaseService',
  'CaseService',
  'strataService',
  'AlertService',
  function (
    $scope,
    securityService,
    SearchCaseService,
    CaseService,
    strataService,
    AlertService) {

    $scope.securityService = securityService;
    $scope.SearchCaseService = SearchCaseService;
    $scope.CaseService = CaseService;

    $scope.productsLoading = true;
    strataService.products.list().then(
      function(products) {
        $scope.productsLoading = false;
        CaseService.products = products;
      },
      function(error) {
        $scope.productsLoading = false;
        AlertService.addStrataErrorMessage(error);
      })
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('RecommendationsSection', [
  'RecommendationsService',
  '$scope',
  'strataService',
  'CaseService',
  'AlertService',
  function(
      RecommendationsService,
      $scope,
      strataService,
      CaseService,
      AlertService) {

    $scope.RecommendationsService = RecommendationsService;

    $scope.recommendationsPerPage = 4;
    $scope.maxRecommendationsSize = 10;

    $scope.selectRecommendationsPage = function(pageNum) {
      //filter out pinned recommendations
      angular.forEach(RecommendationsService.pinnedRecommendations, 
          function(pinnedRec) {
            angular.forEach(RecommendationsService.recommendations,
              function(rec, index) {
                if (angular.equals(rec.id, pinnedRec.id)) {
                  RecommendationsService.recommendations.splice(index, 1);
                }
              }
            );
          }
      );

      angular.forEach(RecommendationsService.handPickedRecommendations,
          function(handPickedRec) {
            angular.forEach(RecommendationsService.recommendations,
              function(rec, index) {
                if (angular.equals(rec.id, handPickedRec.id)) {
                  RecommendationsService.recommendations.splice(index, 1);
                }
              }
            );
          }
      );

      var recommendations = RecommendationsService.pinnedRecommendations.concat(
          RecommendationsService.recommendations);
      recommendations = RecommendationsService.handPickedRecommendations.concat(
          recommendations);
      var start = $scope.recommendationsPerPage * (pageNum - 1);
      var end = start + $scope.recommendationsPerPage;
      end = end > recommendations.length ? recommendations.length : end;
      $scope.recommendationsOnScreen = recommendations.slice(start, end);
    };

    $scope.currentRecPin;
    $scope.pinRecommendation = function(recommendation, $index, $event) {
      $scope.currentRecPin = recommendation;
      $scope.currentRecPin.pinning = true;
      
      var doPut = function(linked) {
        var recJSON = {
          recommendations: {
            recommendation: [
              {
                linked: linked.toString(), 
                resourceId: recommendation.id,
                resourceType: 'Solution'
              }
            ]
          }
        };

        strataService.cases.put(CaseService.kase.case_number, recJSON).then(
            function(response) {
              if (!$scope.currentRecPin.pinned) {
                //not currently pinned, so add it to the pinned list
                RecommendationsService.pinnedRecommendations.push($scope.currentRecPin);
              } else {
                //currently pinned, so remove from pinned list
                angular.forEach(RecommendationsService.pinnedRecommendations,
                  function(rec, index) {
                    if (rec.id === $scope.currentRecPin.id) {
                      RecommendationsService.pinnedRecommendations.splice(index, 1);
                    }
                  });

                //add the de-pinned rec to the top of the list
                //this allows the user to still view the rec, or re-pin it
                RecommendationsService.recommendations.splice(0, 0, $scope.currentRecPin);
              }

              $scope.currentRecPin.pinning = false;
              $scope.currentRecPin.pinned = !$scope.currentRecPin.pinned;
              $scope.selectPageOne();
            }, 
            function(error) {
              $scope.currentRecPin.pinning = false;
              AlertService.addStrataErrorMessage(error);
            }
        );
      }

      recommendation.pinned ? doPut(false) : doPut(true);
    };

    $scope.selectPageOne = function() {
      $scope.selectRecommendationsPage(1);
      $scope.currentRecommendationPage = 1;
    };

    $scope.triggerAnalytics = function($event) {
      if(window.portal){
        chrometwo_require(['analytics/main'], function (analytics) {
          analytics.trigger('OpenSupportCaseRecommendationClick', $event);
        });
      }
    }

    RecommendationsService.setPopulateCallback($scope.selectPageOne);
  }
]);

'use strict';
/*global $ */


angular.module('RedhatAccess.cases')
.controller('RequestManagementEscalationModal', [
  '$scope',
  '$modalInstance',
  'AlertService',
  'CaseService',
  'strataService',
  '$q',
  '$stateParams',
  function ($scope, $modalInstance, AlertService, CaseService, strataService, $q, $stateParams) {

    $scope.CaseService = CaseService;
    $scope.commentText = CaseService.commentText;

    $scope.submittingRequest = false;
    $scope.submitRequestClick = angular.bind($scope, function(commentText) {
      $scope.submittingRequest = true;
      var promises = [];

      var fullComment = 'Request Management Escalation: ' + commentText;
      var postComment;
      if (CaseService.draftComment) {
          postComment = strataService.cases.comments.put(CaseService.kase.case_number, fullComment, false, CaseService.draftComment.id);
      } else {
          postComment = strataService.cases.comments.post(CaseService.kase.case_number, fullComment, false);
      }
      postComment.then(
        function(response) {
        },
        function(error) {
          AlertService.addStrataErrorMessage(error);
        }
      );
      promises.push(postComment);

      var caseJSON = {
        'escalated': true
      };
      var updateCase = strataService.cases.put(CaseService.kase.case_number, caseJSON);
      updateCase.then(
          function(response) {
          },
          function(error) {
            AlertService.addStrataErrorMessage(error);
          }
      );
      promises.push(updateCase);

      var masterPromise = $q.all(promises);
      masterPromise.then(
          function(response) {
            CaseService.populateComments($stateParams.id).then(
              function(comments) {
                CaseService.refreshComments();
                $scope.closeModal();
                $scope.submittingRequest = false;
              }
            );
          },
          function(error) {
            AlertService.addStrataErrorMessage(error);
          }
      );
      return masterPromise;
    });

    $scope.closeModal = function() {
      $modalInstance.close();
    };
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
  .controller('Search', [
    '$scope',
    '$rootScope',
    'AUTH_EVENTS',
    'securityService',
    'SearchCaseService',
    'CaseService',
    'STATUS',
    'SearchBoxService',
    'AlertService',
    function (
      $scope,
      $rootScope,
      AUTH_EVENTS,
      securityService,
      SearchCaseService,
      CaseService,
      STATUS,
      SearchBoxService,
      AlertService) {

      $scope.securityService = securityService;
      $scope.SearchCaseService = SearchCaseService;
      $scope.CaseService = CaseService;

      $scope.itemsPerPage = 10;
      $scope.maxPagerSize = 5;

      $scope.selectPage = function (pageNum) {
        if(!SearchCaseService.allCasesDownloaded && (($scope.itemsPerPage * pageNum) / SearchCaseService.total >= .8)){
          SearchCaseService.doFilter().then(
                function () {
                  var start = $scope.itemsPerPage * (pageNum - 1);
                  var end = start + $scope.itemsPerPage;
                  end = end > SearchCaseService.cases.length ?
                    SearchCaseService.cases.length : end;

                  $scope.casesOnScreen =
                    SearchCaseService.cases.slice(start, end);
            }
          );
        } else {
          var start = $scope.itemsPerPage * (pageNum - 1);
          var end = start + $scope.itemsPerPage;
          end = end > SearchCaseService.cases.length ?
            SearchCaseService.cases.length : end;

          $scope.casesOnScreen =
            SearchCaseService.cases.slice(start, end);
        }
      };

      SearchBoxService.doSearch =
        CaseService.onSelectChanged =
        CaseService.onOwnerSelectChanged =
        CaseService.onGroupSelectChanged = function () {
          SearchCaseService.doFilter().then(
            function () {
              $scope.selectPage(1);
            }
          );
      };

      if (securityService.loginStatus.isLoggedIn) {
        CaseService.clearCase();
        SearchCaseService.clear();
        SearchBoxService.doSearch();
      }

      $rootScope.$on(AUTH_EVENTS.loginSuccess, function () {
        SearchBoxService.doSearch();
        AlertService.clearAlerts();
      });



      $rootScope.$on(AUTH_EVENTS.logoutSuccess, function () {
        CaseService.clearCase();
        SearchCaseService.clear();
      });


    }
  ]);
'use strict';

angular.module('RedhatAccess.cases')
.controller('SearchBox', [
  '$scope',
  'SearchBoxService',
  'securityService',
  function (
    $scope,
    SearchBoxService,
    securityService) {

    $scope.securityService = securityService;
    $scope.SearchBoxService = SearchBoxService;

    $scope.onFilterKeyPress = function($event) {
      if ($event.keyCode === 13) {
        SearchBoxService.doSearch();
      } else if (angular.isFunction(SearchBoxService.onKeyPress)){
        SearchBoxService.onKeyPress();
      }
    };
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('SeveritySelect', [
  '$scope',
  'securityService',
  'strataService',
  'CaseService',
  'AlertService',
  function (
    $scope,
    securityService,
    strataService,
    CaseService,
    AlertService) {

    $scope.securityService = securityService;
    $scope.CaseService = CaseService;

    $scope.severitiesLoading = true;
    strataService.values.cases.severity().then(
      function(severities) {
        $scope.severitiesLoading = false;
        CaseService.severities = severities;
      },
      function(error) {
        $scope.severitiesLoading = false;
        AlertService.addStrataErrorMessage(error);
      });
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('StatusSelect', [
  '$scope',
  'securityService',
  'CaseService',
  'STATUS',
  function (
    $scope,
    securityService,
    CaseService,
    STATUS) {

    $scope.securityService = securityService;
    $scope.CaseService = CaseService;
    $scope.STATUS = STATUS;

    $scope.statuses = [
      {
        name: 'Open and Closed',
        value: STATUS.both
      },
      {
        name: 'Open',
        value: STATUS.open
      },
      {
        name: 'Closed',
        value: STATUS.closed
      }
    ];
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('TypeSelect', [
  '$scope',
  'securityService',
  'CaseService',
  'strataService',
  'AlertService',
  function (
    $scope,
    securityService,
    CaseService,
    strataService,
    AlertService) {

    $scope.securityService = securityService;
    $scope.CaseService = CaseService;

    $scope.typesLoading = true;
    strataService.values.cases.types().then(
      function(types) {
        $scope.typesLoading = false;
        CaseService.types = types;
      },
      function(error) {
        $scope.typesLoading = false;
        AlertService.addStrataErrorMessage(error);
      })
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaAccountselect', function () {
  return {
    templateUrl: 'cases/views/accountSelect.html',
    restrict: 'A',
    controller: 'AccountSelect'
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaAddcommentsection', function () {
  return {
    templateUrl: 'cases/views/addCommentSection.html',
    restrict: 'A',
    controller: 'AddCommentSection'
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaAttachlocalfile', function () {
  return {
    templateUrl: 'cases/views/attachLocalFile.html',
    restrict: 'A',
    controller: 'AttachLocalFile',
    scope: {
      disabled: '='
    }
  };
});

'use strict';
/*jshint unused:vars */

angular.module('RedhatAccess.cases')
.directive('rhaAttachproductlogs', function () {
  return {
    templateUrl: 'cases/views/attachProductLogs.html',
    restrict: 'A',
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';
/*jshint unused:vars */

angular.module('RedhatAccess.cases')
.directive('rhaCaseattachments', function () {
  return {
    templateUrl: 'cases/views/attachmentsSection.html',
    restrict: 'A',
    controller: 'AttachmentsSection',
    scope: {
      loading: '='
    },
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';
/*jshint unused:vars */

angular.module('RedhatAccess.cases')
	.directive('rhaChatbutton', function () {
		return {
			scope: {},
			templateUrl: 'cases/views/chatButton.html',
			restrict: 'A',
			controller: 'ChatButton'
		};
	});
'use strict';
/*jshint unused:vars */

angular.module('RedhatAccess.cases')
  .directive('rhaCasecomments', function() {
    return {
      templateUrl: 'cases/views/commentsSection.html',
      controller: 'CommentsSection',
      scope: {
        loading: '='
      },
      restrict: 'A',
      link: function postLink(scope, element, attrs) {}
    };
  });

'use strict';
/*jshint unused:vars */

angular.module('RedhatAccess.cases')
.directive('rhaCompactcaselist', function () {
  return {
    templateUrl: 'cases/views/compactCaseList.html',
    controller: 'CompactCaseList',
    scope: {
    },
    restrict: 'A',
    link: function postLink(scope, element, attrs) {
    }
  };
});


'use strict';
/*jshint unused:vars */
angular.module('RedhatAccess.cases')
.directive('rhaCreategroupbutton', function () {
  return {
    templateUrl: 'cases/views/createGroupButton.html',
    restrict: 'A',
    controller: 'CreateGroupButton'
  };
});

'use strict';
/*jshint unused:vars */
angular.module('RedhatAccess.cases')
.directive('rhaDeletegroupbutton', function () {
  return {
    templateUrl: 'cases/views/deleteGroupButton.html',
    restrict: 'A',
    controller: 'DeleteGroupButton'
  };
});

'use strict';
/*jshint unused:vars */

angular.module('RedhatAccess.cases')
  .directive('rhaCasedescription', function() {
    return {
      templateUrl: 'cases/views/descriptionSection.html',
      restrict: 'A',
      scope: {
        loading: '='
      },
      controller: 'DescriptionSection',
      link: function postLink(scope, element, attrs) {}
    };
  });

'use strict';
/*jshint unused:vars */

angular.module('RedhatAccess.cases')
.directive('rhaCasedetails', function () {
  return {
    templateUrl: 'cases/views/detailsSection.html',
    controller: 'DetailsSection',
    scope: {
      compact: '=',
      loading: '='
    },
    restrict: 'A',
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaEmailnotifyselect', function () {
  return {
    templateUrl: 'cases/views/emailNotifySelect.html',
    restrict: 'A',
    controller: 'EmailNotifySelect'
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaEntitlementselect', function () {
  return {
    templateUrl: 'cases/views/entitlementSelect.html',
    restrict: 'A',
    controller: 'EntitlementSelect'
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaExportcsvbutton', function () {
  return {
    templateUrl: 'cases/views/exportCSVButton.html',
    restrict: 'A',
    controller: 'ExportCSVButton'
  };
});

'use strict';
/*jshint unused:vars */
angular.module('RedhatAccess.cases')
.directive('rhaGrouplist', function () {
  return {
    templateUrl: 'cases/views/groupList.html',
    restrict: 'A',
    controller: 'GroupList'
  };
});

'use strict';
/*jshint unused:vars */
angular.module('RedhatAccess.cases')
.directive('rhaGroupselect', function () {
  return {
    templateUrl: 'cases/views/groupSelect.html',
    restrict: 'A',
    controller: 'GroupSelect',
    scope: {
      onchange: '&',
      showsearchoptions: '='
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaListattachments', function () {
  return {
    templateUrl: 'cases/views/listAttachments.html',
    restrict: 'A',
    controller: 'ListAttachments',
    scope: {
      disabled: '='
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaListbugzillas', function () {
  return {
    templateUrl: 'cases/views/listBugzillas.html',
    restrict: 'A',
    controller: 'ListBugzillas',
    scope: {
      loading: '='
    },
    link: function postLink(scope, element, attrs) {
    }
  };
});
'use strict';
/*jshint unused:vars */
angular.module('RedhatAccess.cases')
.directive('rhaListfilter', function () {
  return {
    templateUrl: 'cases/views/listFilter.html',
    restrict: 'A',
    controller: 'ListFilter',
    scope: {
      prefilter: '=',
      postfilter: '='
    },
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
  .directive('rhaListnewattachments', function() {
    return {
      templateUrl: 'cases/views/listNewAttachments.html',
      restrict: 'A',
      controller: 'ListNewAttachments'
    };
  });
'use strict';
/*jshint unused:vars */

angular.module('RedhatAccess.cases')
.directive('rhaOnchange', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      element.bind('change', element.scope()[attrs.rhaOnChange]);
    }
  };
});
'use strict';
/*jshint unused:vars */
angular.module('RedhatAccess.cases')
.directive('rhaOwnerselect', function () {
  return {
    templateUrl: 'cases/views/ownerSelect.html',
    restrict: 'A',
    controller: 'OwnerSelect',
    scope: {
      onchange: '&'
    }
  };
});

'use strict';
/*jshint unused:vars */

angular.module('RedhatAccess.cases')
.directive('rhaPageheader', function () {
  return {
    templateUrl: 'cases/views/pageHeader.html',
    restrict: 'A',
    scope: {
      title: '=title'
    },
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';
/*jshint unused:vars */
angular.module('RedhatAccess.cases')
.directive('rhaProductselect', function () {
  return {
    templateUrl: 'cases/views/productSelect.html',
    restrict: 'A',
    controller: 'ProductSelect',
    scope: {
      onchange: '&'
    }
  };
});

'use strict';
/*jshint unused:vars */

angular.module('RedhatAccess.cases')
.directive('rhaCaserecommendations', function () {
  return {
    templateUrl: 'cases/views/recommendationsSection.html',
    restrict: 'A',
    controller: 'RecommendationsSection',
    scope: {
      loading: '='
    },
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';
/*jshint unused:vars */

angular.module('RedhatAccess.cases')
.directive('rhaSearchbox', function () {
  return {
    templateUrl: 'cases/views/searchBox.html',
    restrict: 'A',
    controller: 'SearchBox',
    scope: {
      placeholder: '='
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaCasesearchresult', function () {
  return {
    templateUrl: 'cases/views/searchResult.html',
    restrict: 'A',
    scope: {
      theCase: '=case'
    }
  };
});

'use strict';
/*jshint unused:vars */

angular.module('RedhatAccess.cases')
.directive('rhaSelectloadingindicator', function () {
  return {
    templateUrl: 'cases/views/selectLoadingIndicator.html',
    restrict: 'A',
    transclude: true,
    scope: {
      loading: '=',
      type: '@'
    }
  };
});

'use strict';
/*jshint unused:vars */
angular.module('RedhatAccess.cases')
.directive('rhaSeverityselect', function () {
  return {
    templateUrl: 'cases/views/severitySelect.html',
    restrict: 'A',
    controller: 'SeveritySelect',
    scope: {
      onchange: '&'
    }
  };
});

'use strict';
/*jshint unused:vars */
angular.module('RedhatAccess.cases')
.directive('rhaStatusselect', function () {
  return {
    templateUrl: 'cases/views/statusSelect.html',
    restrict: 'A',
    controller: 'StatusSelect',
    scope: {
      onchange: '&'
    }
  };
});

'use strict';
/*jshint unused:vars */
angular.module('RedhatAccess.cases')
.directive('rhaTypeselect', function () {
  return {
    templateUrl: 'cases/views/typeSelect.html',
    restrict: 'A',
    controller: 'TypeSelect',
    scope: {
      onchange: '&'
    }
  };
});

'use strict';
angular.module('RedhatAccess.cases')
  .filter('bytes', function() {
    return function(bytes, precision) {
      if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) {
        return '-';
      }
      if (typeof precision === 'undefined') {
        precision = 1;
      }
      var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
        number = Math.floor(Math.log(bytes) / Math.log(1024));
      return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
    };
  });
'use strict';

angular.module('RedhatAccess.cases')
.filter('recommendationsResolution', function() {
  return function(text) {
    var shortText = '';
    var maxTextLength = 150;

    if (text != null && text.length > maxTextLength) {
      shortText = text.substr(0, maxTextLength);
      // var lastSpace = shortText.lastIndexOf(' ');
      // shortText = shortText.substr(0, lastSpace);
      shortText = shortText.concat('...');
    } else {
      shortText = text;
    }

    return shortText;
  };
});

'use strict';
/*jshint camelcase: false */

angular.module('RedhatAccess.cases')
  .service('AttachmentsService', [
    '$filter',
    '$q',
    'strataService',
    'TreeViewSelectorUtils',
    '$http',
    'securityService',
    'AlertService',
    'CaseService',
    'translate',
    function ($filter, $q, strataService, TreeViewSelectorUtils, $http, securityService, AlertService, CaseService, translate) {
      this.originalAttachments = [];
      this.updatedAttachments = [];

      this.backendAttachments = [];

      this.clear = function () {
        this.originalAttachments = [];
        this.updatedAttachments = [];
        this.backendAttachments = [];
      };

      this.updateBackEndAttachments = function (selected) {
        this.backendAttachments = selected;
      };

      this.hasBackEndSelections = function () {
        return TreeViewSelectorUtils.hasSelections(this.backendAttachments);
      };

      this.removeUpdatedAttachment = function ($index) {
        this.updatedAttachments.splice($index, 1);
      };

      this.removeOriginalAttachment = function ($index) {
        var attachment = this.originalAttachments[$index];
        var progressMessage =
          AlertService.addWarningMessage(
            translate('Deleting attachment:')+ ' ' + attachment.file_name + ' - ' + attachment.uuid);

        strataService.cases.attachments.remove(attachment.uuid, CaseService.kase.case_number).then(
          angular.bind(this, function () {
            AlertService.removeAlert(progressMessage);
            AlertService.addSuccessMessage(
              translate('Successfully deleted attachment:') + ' ' + attachment.file_name + ' - ' + attachment.uuid);
            this.originalAttachments.splice($index, 1);
          }),
          function (error) {
            AlertService.addStrataErrorMessage(error);
          }
        );
      };

      this.addNewAttachment = function (attachment) {
        this.updatedAttachments.push(attachment);
      };

      this.defineOriginalAttachments = function (attachments) {
        if (!angular.isArray(attachments)) {
          this.originalAttachments = [];
        } else {
          this.originalAttachments = attachments;
        }
      };

      this.postBackEndAttachments = function (caseId) {
        var selectedFiles = TreeViewSelectorUtils.getSelectedLeaves(this.backendAttachments);
        return securityService.getBasicAuthToken().then(
          function (auth) {
            /*jshint unused:false */
            //we post each attachment separately
            var promises = [];
            angular.forEach(selectedFiles, function (file) {
              var jsonData = {
                authToken: auth,
                attachment: file,
                caseNum: caseId
              };
              var deferred = $q.defer();
              $http.post('attachments', jsonData).success(function (data, status, headers, config) {
                deferred.resolve(data);
                AlertService.addSuccessMessage(
                  translate('Successfully uploaded attachment') + ' '+
                  jsonData.attachment + ' '+translate('to case') + ' ' + caseId);
              }).error(function (data, status, headers, config) {
                var error_msg = '';
                switch (status) {
                case 401:
                  error_msg = ' : Unauthorised.';
                  break;
                case 409:
                  error_msg = ' : Invalid username/password.';
                  break;
                case 500:
                  error_msg = ' : Internal server error';
                  break;
                }
                AlertService.addDangerMessage(
                  'Failed to upload attachment ' +
                  jsonData.attachment + ' to case ' + caseId + error_msg);
                deferred.reject(data);
              });
              promises.push(deferred.promise);
            });
            return $q.all(promises);
          });
      };

      this.updateAttachments = function (caseId) {
        var hasLocalAttachments = !angular.equals(this.originalAttachments, this.updatedAttachments);
        var hasServerAttachments = this.hasBackEndSelections;
        if (hasLocalAttachments || hasServerAttachments) {
          var promises = [];
          var updatedAttachments = this.updatedAttachments;
          if (hasServerAttachments) {
            promises.push(this.postBackEndAttachments(caseId));
          }
          if (hasLocalAttachments) {
            //find new attachments
            angular.forEach(updatedAttachments, function (attachment) {
              if (!attachment.hasOwnProperty('uuid')) {
                var promise = strataService.cases.attachments.post(
                  attachment.file,
                  caseId
                );
                promise.then(
                  function (uri) {
                    attachment.uri = uri;
                    attachment.uuid = uri.slice(uri.lastIndexOf('/') + 1);
                    AlertService.addSuccessMessage(
                      'Successfully uploaded attachment ' +
                      attachment.file_name + ' to case ' + caseId);
                  },
                  function (error) {
                    AlertService.addStrataErrorMessage(error);
                  }
                );
                promises.push(promise);
              }
            });
          }

          var uploadingAlert = AlertService.addWarningMessage('Uploading attachments...');
          var parentPromise = $q.all(promises);
          parentPromise.then(
            angular.bind(this, function () {
              this.originalAttachments =
                this.originalAttachments.concat(this.updatedAttachments);
              this.updatedAttachments = [];
              AlertService.removeAlert(uploadingAlert);
            }),
            function (error) {
              AlertService.addStrataErrorMessage(error);
              AlertService.removeAlert(uploadingAlert);
            }
          );

          return parentPromise;
        }
      };
    }
  ]);

'use strict';

angular.module('RedhatAccess.cases')
.service('CaseListService', [
  function () {
    this.cases = [];

    this.defineCases = function(cases) {
      this.cases = cases;
    };
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
  .service('CaseService', [
    'strataService',
    'AlertService',
    'ENTITLEMENTS',
    'RHAUtils',
    'securityService',
    '$q',
    '$filter',
    function(strataService, AlertService, ENTITLEMENTS, RHAUtils, securityService, $q, $filter) {
      this.
      kase = {};
      this.versions = [];
      this.products = [];
      //this.statuses = [];
      this.severities = [];
      this.groups = [];
      this.users = [];
      this.comments = [];

      this.originalNotifiedUsers = [];
      this.updatedNotifiedUsers = [];

      this.account = {};

      this.draftComment = '';
      this.commentText = '';
      this.status = '';
      this.severity = '';
      this.type = '';
      this.group = '';
      this.owner = '';
      this.product = '';
      this.bugzillaList = {};

      this.onSelectChanged = null;
      this.onOwnerSelectChanged = null;
      this.onGroupSelectChanged = null;
      /**
       * Add the necessary wrapper objects needed to properly display the data.
       *
       * @param rawCase
       */
      this.defineCase = function(rawCase) {
        /*jshint camelcase: false */
        rawCase.severity = {
          'name': rawCase.severity
        };
        rawCase.status = {
          'name': rawCase.status
        };
        rawCase.product = {
          'name': rawCase.product
        };
        rawCase.group = {
          'number': rawCase.folder_number
        };
        rawCase.type = {
          'name': rawCase.type
        };

        this.
        kase = rawCase;

        this.bugzillaList = rawCase.bugzillas;

      };

      this.defineAccount = function(account) {
        this.account = account;
      };

      this.defineNotifiedUsers = function() {
        /*jshint camelcase: false */
        this.updatedNotifiedUsers.push(this.kase.contact_sso_username);

        //hide the X button for the case owner
        $('#rha-emailnotifyselect').on('change', angular.bind(this, function() {
          $('rha-emailnotifyselect .select2-choices li:contains("' + this.kase.contact_sso_username + '") a').css('display', 'none');
          $('rha-emailnotifyselect .select2-choices li:contains("' + this.kase.contact_sso_username + '")').css('padding-left', '5px');
        }));

        if (RHAUtils.isNotEmpty(this.kase.notified_users)) {

          angular.forEach(this.kase.notified_users.link,
            angular.bind(this, function(user) {
              this.originalNotifiedUsers.push(user.sso_username);
            })
          );
          this.updatedNotifiedUsers =
            this.updatedNotifiedUsers.concat(this.originalNotifiedUsers);
        }
      };

      this.getGroups = function() {
        return this.groups;
      };

      this.clearCase = function() {
        this.
        kase = {};

        this.versions = [];
        this.products = [];
        this.statuses = [];
        this.severities = [];
        this.groups = [];
        this.account = {};
        this.comments = [];
        this.bugzillaList = {};

        this.draftComment = undefined;
        this.commentText = undefined;
        this.status = undefined;
        this.severity = undefined;
        this.type = undefined;
        this.group = undefined;
        this.owner = undefined;
        this.product = undefined;
      };

      this.groupsLoading = false;

      this.populateGroups = function(ssoUsername) {
        this.groupsLoading = true;
        strataService.groups.list(ssoUsername).then(
          angular.bind(this, function(groups) {
            this.groups = groups;
            this.groupsLoading = false;
          }),
          angular.bind(this, function(error) {
            this.groupsLoading = false;
            AlertService.addStrataErrorMessage(error);
          })
        );
      };

      this.usersLoading = false;

      /**
       *  Intended to be called only after user is logged in and has account details
       *  See securityService.
       */
      this.populateUsers = angular.bind(this, function () {
        var promise = null;

        if (securityService.loginStatus.orgAdmin) {
          this.usersLoading = true;

          var accountNumber =
            RHAUtils.isEmpty(this.account.number) ?
              securityService.loginStatus.account.number : this.account.number;

          promise = strataService.accounts.users(accountNumber);
          promise.then(
              angular.bind(this, function(users) {
                this.usersLoading = false;
                this.users = users;
              }),
              angular.bind(this, function(error) {
                this.usersLoading = false;
                this.users = [];
                AlertService.addStrataErrorMessage(error);
              })
          );
        } else {
          var deferred = $q.defer();
          promise = deferred.promise;
          deferred.resolve();

          this.users = [];
        }

        return promise;
      });

      this.refreshComments = null;

      this.populateComments = function(caseNumber) {
        var promise = strataService.cases.comments.get(caseNumber);

        promise.then(
            angular.bind(this, function(comments) {
              //pull out the draft comment
              angular.forEach(comments, angular.bind(this, function(comment, index) {
                if (comment.draft === true) {
                  this.draftComment = comment;
                  this.commentText = comment.text;
                  comments.slice(index, index + 1);
                }
              }));

              this.comments = comments;
            }),
            function(error) {
              AlertService.addStrataErrorMessage(error);
            }
        );

        return promise;
      };

      this.entitlementsLoading = false;
      this.populateEntitlements = function(ssoUserName) {
        this.entitlementsLoading = true;
        strataService.entitlements.get(false, ssoUserName).then(
          angular.bind(this, function(entitlementsResponse) {
            // if the user has any premium or standard level entitlement, then allow them
            // to select it, regardless of the product.
            // TODO: strata should respond with a filtered list given a product.
            //       Adding the query param ?product=$PRODUCT does not work.
            var premiumSupport = $filter('filter')(entitlementsResponse.entitlement, {'sla': ENTITLEMENTS.premium});
            var standardSupport = $filter('filter')(entitlementsResponse.entitlement, {'sla': ENTITLEMENTS.standard});

            var entitlements = [];
            if (RHAUtils.isNotEmpty(premiumSupport)) {
              entitlements.push(ENTITLEMENTS.premium);
            }
            if (RHAUtils.isNotEmpty(standardSupport)) {
              entitlements.push(ENTITLEMENTS.standard);
            }

            if (entitlements.length === 0) {
              entitlements.push(ENTITLEMENTS.defaults);
            }

            this.entitlements = entitlements;
            this.entitlementsLoading = false;
          }),
          angular.bind(this, function(error) {
            AlertService.addStrataErrorMessage(error);
          })
        );
      };

      this.showFts = function() {
        if (RHAUtils.isNotEmpty(this.severities) && angular.equals(this.kase.severity, this.severities[0])) {
          if (this.entitlement === ENTITLEMENTS.premium ||
              (RHAUtils.isNotEmpty(this.kase.entitlement) &&
               this.kase.entitlement.sla === ENTITLEMENTS.premium)) {
            return true;
          }
        }
        return false;
      };

      this.newCasePage1Incomplete = true;
      this.validateNewCasePage1 = function () {
        if (RHAUtils.isEmpty(this.kase.product) ||
          RHAUtils.isEmpty(this.kase.version) ||
          RHAUtils.isEmpty(this.kase.summary) ||
          RHAUtils.isEmpty(this.kase.description) ||
          (securityService.loginStatus.isInternal && RHAUtils.isEmpty(this.owner))) {
          this.newCasePage1Incomplete = true;
        } else {
          this.newCasePage1Incomplete = false;
        }
      };
    }
  ]);

'use strict';
 /*jshint unused:vars */
 /*jshint camelcase: false */
angular.module('RedhatAccess.cases')
.service('GroupService', [
  'strataService',
  function (strataService) {

    this.reloadTable;
    this.groupsOnScreen = [];
  }
]);

'use strict';
 /*jshint unused:vars */
 /*jshint camelcase: false */
angular.module('RedhatAccess.cases')
.service('RecommendationsService', [
  'strataService',
  'CaseService',
  '$q',
  function (strataService, CaseService, $q) {

    this.recommendations = [];
    this.pinnedRecommendations = [];
    this.handPickedRecommendations = [];
    this.populateCallback = function() {};

    var currentData = {};
    this.loadingRecommendations = false;

    var setCurrentData = function () {
      currentData = {
        product: CaseService.kase.product,
        version: CaseService.kase.version,
        summary: CaseService.kase.summary,
        description: CaseService.kase.description
      };
    };
    setCurrentData();

    this.clear = function() {
      this.recommendations = [];
    };

    this.setPopulateCallback = function(callback) {
      this.populateCallback = callback;
    };

    this.populatePinnedRecommendations = function() {
      var promises = [];

      if (CaseService.kase.recommendations) {
        //Push any pinned recommendations to the front of the array
        if (CaseService.kase.recommendations.recommendation) {
          var pinnedRecsPromises = [];
          angular.forEach(CaseService.kase.recommendations.recommendation, 
              angular.bind(this, function(rec) {
                if (rec.pinned_at) {
                  var promise =
                    strataService.solutions.get(rec.solution_url).then(
                      angular.bind(this, function(solution) {
                        solution.pinned = true;
                        this.pinnedRecommendations.push(solution);
                      }),
                      function(error) {
                        AlertService.addStrataErrorMessage(error);
                      }
                    );
                  promises.push(promise);
                } else if (rec.linked){
                  var promise = 
                    strataService.solutions.get(rec.solution_url).then(
                      angular.bind(this, function(solution) {
                        //solution.pinned = true;
                        solution.handPicked = true;
                        this.handPickedRecommendations.push(solution);
                      }),
                      function(error) {
                        AlertService.addStrataErrorMessage(error);
                      }
                    );
                  promises.push(promise);
                }
              })
          );
        }
      }

      var masterPromise = $q.all(promises);
      masterPromise.then(angular.bind(this, function() {this.populateCallback();}));
      return masterPromise;
    };

    this.failureCount = 0;
    this.populateRecommendations = function (max) {

      var masterDeferred = $q.defer();

      masterDeferred.promise.then(this.populateCallback);

      var newData = {
        product: CaseService.kase.product,
        version: CaseService.kase.version,
        summary: CaseService.kase.summary,
        description: CaseService.kase.description
      };

      if ((!angular.equals(currentData, newData) && !this.loadingRecommendations) || 
          (this.recommendations.length < 1 && this.failureCount < 10)) {
        this.loadingRecommendations = true;
        setCurrentData();
        var deferreds = [];

        strataService.problems(currentData, max).then(
            angular.bind(this, function(solutions) {
              //retrieve details for each solution
              solutions.forEach(function (solution) {
                var deferred = strataService.solutions.get(solution.uri);
                deferreds.push(deferred);
              });

              $q.all(deferreds).then(
                  angular.bind(this, function (solutions) {
                    this.recommendations = [];

                    solutions.forEach(angular.bind(this, function (solution) {
                      if (solution !== undefined) {
                        solution.resource_type = 'Solution';
                        this.recommendations.push(solution);
                      }
                    }));
                    this.loadingRecommendations = false;
                    masterDeferred.resolve();
                  }),
                  angular.bind(this, function (error) {
                    this.loadingRecommendations = false;
                    masterDeferred.resolve();
                  })
              );
            }),
            angular.bind(this, function(error) {
              masterDeferred.reject();
              this.failureCount++;
              this.populateRecommendations(12);
            })
        );
      } else {
        masterDeferred.resolve();
      }

      return masterDeferred.promise;
    };
  }
]);

'use strict';
 /*jshint unused:vars */
 /*jshint camelcase: false */
angular.module('RedhatAccess.cases')
.service('SearchBoxService', [
  function () {
    this.doSearch;
    this.searchTerm;
    this.onKeyPress;
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
  .service('SearchCaseService', [
    'CaseService',
    'strataService',
    'AlertService',
    'STATUS',
    'CASE_GROUPS',
    'AUTH_EVENTS',
    '$q',
    '$state',
    '$rootScope',
    'SearchBoxService',
    'securityService',
    function (
      CaseService,
      strataService,
      AlertService,
      STATUS,
      CASE_GROUPS,
      AUTH_EVENTS,
      $q,
      $state,
      $rootScope,
      SearchBoxService,
      securityService) {

      this.cases = [];
      this.searching = false;
      this.prefilter;
      this.postfilter;
      this.start = 0;
      this.count = 100;
      this.total = 0;
      this.allCasesDownloaded = false;

      var getIncludeClosed = function () {
        if (CaseService.status === STATUS.open) {
          return false;
        } else if (CaseService.status === STATUS.closed) {
          return true;
        } else if (CaseService.status === STATUS.both) {
          return true;
        }

        return true;
      };

      this.clear = function () {
        this.cases = [];
        this.oldParams = {};
        SearchBoxService.searchTerm = '';
        this.start = 0;
        this.total = 0;
        this.allCasesDownloaded = false;
      };

      this.oldParams = {};
      this.doFilter = function () {
        if (angular.isFunction(this.prefilter)) {
          this.prefilter();
        }

        var params = {
          include_closed: getIncludeClosed(),
          count: this.count,
        };
        params.start = this.start;

        var isObjectNothing = function (object) {
          if (object === '' || object === undefined || object === null) {
            return true;
          } else {
            return false;
          }
        };

        if (!isObjectNothing(SearchBoxService.searchTerm)) {
          params.keyword = SearchBoxService.searchTerm;
        }

        if (CaseService.group === CASE_GROUPS.manage) {
          $state.go('group');
        } else if (CaseService.group === CASE_GROUPS.ungrouped) {
          params.only_ungrouped = true;
        } else if (!isObjectNothing(CaseService.group)) {
          params.group_numbers = {
            group_number: [CaseService.group]
          };
        }

        if (CaseService.status === STATUS.closed) {
          params.status = STATUS.closed;
        }

        if (!isObjectNothing(CaseService.product)) {
          params.product = CaseService.product;
        }

        if (!isObjectNothing(CaseService.owner)) {
          params.owner_ssoname = CaseService.owner;
        }

        if (!isObjectNothing(CaseService.type)) {
          params.type = CaseService.type;
        }

        if (!isObjectNothing(CaseService.severity)) {
          params.severity = CaseService.severity;
        }

        this.searching = true;

        //TODO: hack to get around onchange() firing at page load for each select.
        //Need to prevent initial onchange() event instead of handling here.
        var promises = [];
        if (!angular.equals(params, this.oldParams)) {
          this.oldParams = params;
          var deferred = $q.defer();
          var that = this;
          var cases = null;
          if (securityService.loginStatus.isLoggedIn) {
            if (securityService.loginStatus.ssoName && securityService.loginStatus.isInternal) {
              params.owner_ssoname = securityService.loginStatus.ssoName;
            }
            cases = strataService.cases.filter(params).then(
              angular.bind(that, function (cases) {
                  if(cases.length < that.count){
                    that.allCasesDownloaded = true;
                  }
                  that.cases = that.cases.concat(cases);
                  that.searching = false;
                  that.start = that.start + that.count;
                  that.total = that.total + that.count;

                if (angular.isFunction(that.postFilter)) {
                  that.postFilter();
                }
              }),
              angular.bind(that, function (error) {
                AlertService.addStrataErrorMessage(error);
                that.searching = false;
              })
            );
            deferred.resolve(cases);
          } else {
            $rootScope.$on(AUTH_EVENTS.loginSuccess, function () {
              if (securityService.loginStatus.ssoName && securityService.loginStatus.isInternal) {
                params.owner_ssoname = securityService.loginStatus.ssoName;
              }
              cases = strataService.cases.filter(params).then(
                angular.bind(that, function (cases) {
                  if(cases.length < that.count){
                    that.allCasesDownloaded = true;
                  }
                  that.cases = that.cases.concat(cases);
                  that.searching = false;
                  that.start = that.start + that.count;
                  that.total = that.total + that.count;

                  if (angular.isFunction(that.postFilter)) {
                    that.postFilter();
                  }
                }),
                angular.bind(that, function (error) {
                  AlertService.addStrataErrorMessage(error);
                  that.searching = false;
                })
              );
              deferred.resolve(cases);
            });
          }
          promises.push(deferred.promise);
        } else {
          var deferred = $q.defer();
          deferred.resolve();
          promises.push(deferred.promise);
        }
        return $q.all(promises);
      };
    }
  ]);
'use strict';

angular.module('RedhatAccess.logViewer')
.controller('AccordionDemoCtrl', [
	'$scope', 
	'accordian', 
	function($scope, accordian) {
		$scope.oneAtATime = true;
		$scope.groups = accordian.getGroups();
}]);
'use strict';

angular.module('RedhatAccess.logViewer')
.controller('DropdownCtrl', [
	'$scope', 
	'$http', 
	'$location', 
	'files', 
	'hideMachinesDropdown',
	'AlertService', 
	function($scope, $http, $location, files, hideMachinesDropdown, AlertService) {
		$scope.machinesDropdownText = "Please Select the Machine";
		$scope.items = [];
		$scope.hideDropdown = hideMachinesDropdown.value;
		$scope.loading = false;
		var sessionId = $location.search().sessionId;

		$scope.getMachines = function() {
			$http({
				method : 'GET',
				url : 'machines?sessionId=' + encodeURIComponent(sessionId)
			}).success(function(data, status, headers, config) {
				$scope.items = data;
			}).error(function(data, status, headers, config) {
				AlertService.addDangerMessage(data);
			});
		};
		$scope.machineSelected = function() {
			$scope.loading = true;
			var sessionId = $location.search().sessionId;
			var userId = $location.search().userId;
			files.selectedHost = this.choice;
			$scope.machinesDropdownText = this.choice;
			$http(
			{
				method : 'GET',
				url : 'logs?machine=' + files.selectedHost
				+ '&sessionId=' + encodeURIComponent(sessionId)
				+ '&userId=' + encodeURIComponent(userId)
			}).success(function(data, status, headers, config) {
				$scope.loading = false;
				var tree = new Array();
				parseList(tree, data);
				files.setFileList(tree);
			}).error(function(data, status, headers, config) {
				$scope.loading = false;
				AlertService.addDangerMessage(data);
			});
		};
		if($scope.hideDropdown){
			$scope.machineSelected();
		} else{
			$scope.getMachines();
		}
}]);
'use strict';

angular.module('RedhatAccess.logViewer')
.controller('TabsDemoCtrl', [
	'$rootScope',
	'$scope',
	'$http',
	'$location',
	'files',
	'accordian',
	'SearchResultsService',
	'securityService',
	'AlertService',
	'LOGVIEWER_EVENTS',
	function($rootScope,$scope, $http, $location, files, accordian, SearchResultsService, securityService, AlertService,LOGVIEWER_EVENTS) {
		$scope.tabs = [];
		$scope.isLoading = false;
		$scope.$watch(function() {
			return files.getFileClicked().check;
		}, function() {
			if(files.getFileClicked().check && files.selectedFile != null){
				var tab = new Object();
				if(files.selectedHost != null){
					tab.longTitle = files.selectedHost + ":"
				} else {
					tab.longTitle = new String();
				}
				tab.longTitle = tab.longTitle.concat(files.selectedFile);
				var splitFileName = files.selectedFile.split("/");
				var fileName = splitFileName[splitFileName.length - 1];
				
				if(files.selectedHost != null){
					tab.shortTitle = files.selectedHost + ":"
				} else {
					tab.shortTitle = new String();
				}
				tab.shortTitle = tab.shortTitle.concat(fileName);
				tab.active = true;
				$scope.tabs.push(tab);
				$scope.isLoading = true;
				files.setActiveTab(tab);
				files.setFileClicked(false);
			}
		});
		$scope.$watch(function() {
			return files.file;
		}, function() {
			if (files.file != null && files.activeTab  != null) {
				files.activeTab.content = files.file;
				$scope.isLoading = false;
				files.file = null;
			}
		});
		$scope.$watch(function() {
			return SearchResultsService.searchInProgress.value;
		}, function() {
			if (SearchResultsService.searchInProgress.value == true) {
				$scope.$parent.isDisabled = true;
			} else if(SearchResultsService.searchInProgress.value == false && $scope.$parent.textSelected == true){
				$scope.$parent.isDisabled = false;
			}
		});
		$scope.removeTab = function(index) {
			$scope.tabs.splice(index, 1);
			if ($scope.tabs.length < 1){
				$rootScope.$broadcast(LOGVIEWER_EVENTS.allTabsClosed);
			}
		};

		$scope.checked = false; // This will be
		// binded using the
		// ps-open attribute

		$scope.diagnoseText = function() {
			//$scope.isDisabled = true;
			var text = strata.utils.getSelectedText();
			securityService.validateLogin(true).
			then( function(){
				//Removed in refactor, no loger exists.  Think it hides tool tip??
				//this.tt_isOpen = false;
				if (!$scope.$parent.solutionsToggle) {
					$scope.$parent.solutionsToggle = !$scope.$parent.solutionsToggle;
				}
				
				if (text != "") {
					$scope.checked = !$scope.checked;
					SearchResultsService.diagnose(text, 5);
				}
			});
			// this.tt_isOpen = false;
			// if (!$scope.$parent.solutionsToggle) {
			// 	$scope.$parent.solutionsToggle = !$scope.$parent.solutionsToggle;
			// }
			// var text = strata.utils.getSelectedText();
			// if (text != "") {
			// 	$scope.checked = !$scope.checked;
			// 	SearchResultsService.diagnose(text, 5);
			// }
			//$scope.sleep(5000, $scope.checkTextSelection);
		};


		$scope.refreshTab = function(index){
			var sessionId = $location.search().sessionId;
			var userId = $location.search().userId;
			var fileNameForRefresh = this.$parent.tab.longTitle;
			var hostForRefresh = null;
			var splitNameForRefresh = fileNameForRefresh.split(":");
			if(splitNameForRefresh[0] && splitNameForRefresh[1]){
				hostForRefresh = splitNameForRefresh[0];
				fileNameForRefresh = splitNameForRefresh[1];
				$http(
				{
					method : 'GET',
					url : 'logs?sessionId='
					+ encodeURIComponent(sessionId) + '&userId='
					+ encodeURIComponent(userId) + '&path='
					+ fileNameForRefresh+ '&machine='
					+ hostForRefresh
				}).success(function(data, status, headers, config) {
					$scope.tabs[index].content = data;
				}).error(function(data, status, headers, config) {
					AlertService.addDangerMessage(data);
				});
			}
		};
}]);
'use strict';

angular.module('RedhatAccess.logViewer')
.controller('fileController', [
	'$scope', 
	'files', 
	function($scope, files) {
		$scope.roleList = '';

		$scope.$watch(function() {
			return $scope.mytree.currentNode;
		}, function() {
			if ($scope.mytree.currentNode != null
				&& $scope.mytree.currentNode.fullPath != null) {
				files.setSelectedFile($scope.mytree.currentNode.fullPath);
				files.setRetrieveFileButtonIsDisabled(false);
			} else {
				files.setRetrieveFileButtonIsDisabled(true);
			}
		});
		$scope.$watch(function() {
			return files.fileList;
		}, function() {
			$scope.roleList = files.fileList;
		});
}]);
'use strict';

angular.module('RedhatAccess.logViewer')
.controller('logViewerController', [
	'$scope', 
	'SearchResultsService', 
	function($scope, SearchResultsService) {
		$scope.isDisabled = true;
		$scope.textSelected = false;
		$scope.enableDiagnoseButton = function(){
			//Gotta wait for text to "unselect"
			$scope.sleep(1, $scope.checkTextSelection);
		};
		$scope.checkTextSelection = function(){
			if(strata.utils.getSelectedText()){
				$scope.textSelected = true;
				if(SearchResultsService.searchInProgress.value){
					$scope.isDisabled = true;
				} else {
					$scope.isDisabled = false;
				}
			} else{
				$scope.textSelected = false;
				$scope.isDisabled = true;
			}
			$scope.$apply();
		};

		$scope.sleep = function(millis, callback) {
			setTimeout(function()
        		{ callback(); }
			, millis);
		};
}]);
'use strict';

angular.module('RedhatAccess.logViewer')
.controller('selectFileButton', [
	'$scope', 
	'$rootScope',
	'$http', 
	'$location',
	'files', 
	'AlertService', 
	'LOGVIEWER_EVENTS',
	function($scope,$rootScope, $http, $location,
	files, AlertService, LOGVIEWER_EVENTS) {
		$scope.retrieveFileButtonIsDisabled = files.getRetrieveFileButtonIsDisabled();

		$scope.fileSelected = function() {
			files.setFileClicked(true);
			var sessionId = $location.search().sessionId;
			var userId = $location.search().userId;
			$scope.$parent.$parent.sidePaneToggle = !$scope.$parent.$parent.sidePaneToggle;
			$http(
			{
				method : 'GET',
				url : 'logs?sessionId='
				+ encodeURIComponent(sessionId) + '&userId='
				+ encodeURIComponent(userId) + '&path='
				+ files.selectedFile + '&machine='
				+ files.selectedHost
			}).success(function(data, status, headers, config) {
				files.file = data;
			}).error(function(data, status, headers, config) {
				AlertService.addDangerMessage(data);
			});
		};

		$rootScope.$on(LOGVIEWER_EVENTS.allTabsClosed, function() {
             $scope.$parent.$parent.sidePaneToggle = !$scope.$parent.$parent.sidePaneToggle;
        });
}]);
'use strict';

angular.module('RedhatAccess.logViewer')
.directive('rhaFilldown', [
	'$window', 
	'$timeout', 
	function($window, $timeout) {
		return {
			restrict: 'A',
			link: function postLink(scope, element, attrs) {
				scope.onResizeFunction = function() {
					var distanceToTop = element[0].getBoundingClientRect().top;
					var height = $window.innerHeight - distanceToTop - 21;
					if(element[0].id == 'fileList'){
						height -= 34;
					}
					return scope.windowHeight = height;
				};
	      // This might be overkill?? 
	      //scope.onResizeFunction();
	      angular.element($window).bind('resize', function() {
	      	scope.onResizeFunction();
	      	scope.$apply();
	      });
	      angular.element($window).bind('click', function() {
	      	scope.onResizeFunction();
	      	scope.$apply();
	      });
	      $timeout(scope.onResizeFunction, 100);
	      // $(window).load(function(){
	      // 	scope.onResizeFunction();
	      // 	scope.$apply();
	      // });
	      // scope.$on('$viewContentLoaded', function() {
	      // 	scope.onResizeFunction();
	      // 	//scope.$apply();
	      // });
	  }
	}
}
]);
'use strict';

angular.module('RedhatAccess.logViewer')
.directive('rhaLogtabs', function () {
  return {
    templateUrl: 'log_viewer/views/logTabs.html',
    restrict: 'A',
    link: function postLink(scope, element, attrs) {
    }
  };
});
'use strict';

angular.module('RedhatAccess.logViewer')
.directive('rhaLogsinstructionpane', function () {
  return {
    templateUrl: 'log_viewer/views/logsInstructionPane.html',
    restrict: 'A',
    link: function postLink(scope, element, attrs) {
    }
  };
});
'use strict';

angular.module('RedhatAccess.logViewer')
.directive('rhaNavsidebar', function () {
  return {
    templateUrl: 'log_viewer/views/navSideBar.html',
    restrict: 'A',
    link: function postLink(scope, element, attrs) {
    }
  };
});
'use strict';

angular.module('RedhatAccess.logViewer')
.directive('rhaRecommendations', function () {
  return {
    templateUrl: 'log_viewer/views/recommendations.html',
    restrict: 'A',
    link: function postLink(scope, element, attrs) {
    }
  };
});
'use strict';

angular.module('RedhatAccess.logViewer')
.service('accordian', function() {
	var groups = new Array();
	return {
		getGroups : function() {
			return groups;
		},
		addGroup : function(group) {
			groups.push(group);
		},
		clearGroups : function() {
			groups = '';
		}
	};
});
'use strict';

angular.module('RedhatAccess.logViewer')
.factory('files', function() {
	var fileList = '';
	var selectedFile = '';
	var selectedHost = '';
	var file = '';
	var retrieveFileButtonIsDisabled = {check : true};
	var fileClicked = {check : false};
	var activeTab = null;
	return {
		getFileList : function() {
			return fileList;
		},

		setFileList : function(fileList) {
			this.fileList = fileList;
		},
		getSelectedFile : function() {
			return selectedFile;
		},

		setSelectedFile : function(selectedFile) {
			this.selectedFile = selectedFile;
		},
		getFile : function() {
			return file;
		},

		setFile : function(file) {
			this.file = file;
		}, 

		setRetrieveFileButtonIsDisabled : function(isDisabled){
			retrieveFileButtonIsDisabled.check = isDisabled;
		},

		getRetrieveFileButtonIsDisabled : function() {
			return retrieveFileButtonIsDisabled;
		},
		setFileClicked : function(isClicked){
			fileClicked.check = isClicked;
		},

		getFileClicked : function() {
			return fileClicked;
		},
		setActiveTab : function(activeTab){
			this.activeTab = activeTab;
		},

		getActiveTab : function() {
			return activeTab;
		}
	};
});
angular.module('RedhatAccess.template', ['common/views/alert.html', 'common/views/header.html', 'common/views/title.html', 'common/views/treenode.html', 'common/views/treeview-selector.html', 'security/login_form.html', 'security/login_status.html', 'search/views/accordion_search.html', 'search/views/accordion_search_results.html', 'search/views/list_search_results.html', 'search/views/resultDetail.html', 'search/views/search.html', 'search/views/search_form.html', 'search/views/standard_search.html', 'cases/views/accountSelect.html', 'cases/views/addCommentSection.html', 'cases/views/attachLocalFile.html', 'cases/views/attachProductLogs.html', 'cases/views/attachmentsSection.html', 'cases/views/chatButton.html', 'cases/views/commentsSection.html', 'cases/views/compact.html', 'cases/views/compactCaseList.html', 'cases/views/compactEdit.html', 'cases/views/createGroupButton.html', 'cases/views/createGroupModal.html', 'cases/views/deleteGroupButton.html', 'cases/views/descriptionSection.html', 'cases/views/detailsSection.html', 'cases/views/edit.html', 'cases/views/emailNotifySelect.html', 'cases/views/entitlementSelect.html', 'cases/views/exportCSVButton.html', 'cases/views/group.html', 'cases/views/groupList.html', 'cases/views/groupSelect.html', 'cases/views/list.html', 'cases/views/listAttachments.html', 'cases/views/listBugzillas.html', 'cases/views/listFilter.html', 'cases/views/listNewAttachments.html', 'cases/views/new.html', 'cases/views/ownerSelect.html', 'cases/views/productSelect.html', 'cases/views/recommendationsSection.html', 'cases/views/requestManagementEscalationModal.html', 'cases/views/search.html', 'cases/views/searchBox.html', 'cases/views/searchResult.html', 'cases/views/selectLoadingIndicator.html', 'cases/views/severitySelect.html', 'cases/views/statusSelect.html', 'cases/views/typeSelect.html', 'log_viewer/views/logTabs.html', 'log_viewer/views/log_viewer.html', 'log_viewer/views/logsInstructionPane.html', 'log_viewer/views/navSideBar.html', 'log_viewer/views/recommendations.html']);

angular.module("common/views/alert.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("common/views/alert.html",
    "<div class=\"container-fluid\">\n" +
    "    <div class=\"row\" style=\"padding-bottom: 5px;\">\n" +
    "        <div class=\"col-xs-12\">\n" +
    "            <a style=\"float: right\" ng-show=\"AlertService.alerts.length > 1\" ng-href=\"\" ng-click=\"dismissAlerts()\">{{'Close messages'|translate}}</a>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"col-xs-12\">\n" +
    "            <div alert ng-repeat='alert in AlertService.alerts' type='alert.type' close='closeAlert($index)'>{{alert.message}}</div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("common/views/header.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("common/views/header.html",
    "<div class=\"rha-page-header\">\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"col-xs-12\">\n" +
    "            <div rha-titletemplate page=\"{{page}}\"/>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"col-xs-12\">\n" +
    "            <div rha-loginstatus />\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"rha-bottom-border\" />\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"col-xs-12\">\n" +
    "            <div rha-alert />\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("common/views/title.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("common/views/title.html",
    "<h1 ng-show='showTitle'>{{titlePrefix}}{{getPageTitle()}}</h1>\n" +
    "");
}]);

angular.module("common/views/treenode.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("common/views/treenode.html",
    "<li class=\"rha-treeselector-node\">\n" +
    "    <div>\n" +
    "        <span class=\"icon\" ng-class=\"{collapsed: choice.collapsed, expanded: !choice.collapsed}\" ng-show=\"choice.children.length > 0\" ng-click=\"choice.collapsed = !choice.collapsed\">\n" +
    "        </span>\n" +
    "        <span class=\"label\" ng-if=\"choice.children.length > 0\" ng-class=\"folder\">{{choice.name}}\n" +
    "        </span>\n" +
    "        <span class=\"label\" ng-if=\"choice.children.length === 0\"  ng-click=\"choiceClicked(choice)\">\n" +
    "            <input type=\"checkbox\" ng-checked=\"choice.checked\">{{choice.name}}\n" +
    "        </span>\n" +
    "    </div>\n" +
    "</li>");
}]);

angular.module("common/views/treeview-selector.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("common/views/treeview-selector.html",
    "<div ng-controller=\"TreeViewSelectorCtrl\">\n" +
    "	<div> {{'Choose File(s) To Attach:'|translate}} </div>\n" +
    "  <rha-choice-tree ng-model=\"attachmentTree\"></rha-choice-tree>\n" +
    "  <pre>{{attachmentTree| json}}</pre>\n" +
    "</div>");
}]);

angular.module("security/login_form.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("security/login_form.html",
    "<div class=\"modal-header\" id=\"rha-login-modal-header\">\n" +
    "    <h3 translate>\n" +
    "        Sign into the Red Hat Customer Portal\n" +
    "    </h3>\n" +
    "</div>\n" +
    "<div class=\"container-fluid\">\n" +
    "    <div class=\"modal-body form-horizontal\" id=\"rha-login-modal-body\">\n" +
    "        <!--form ng-submit=\"modalOptions.ok()\"  method=\"post\"-->\n" +
    "        <div class=\"form-group\" ng-show='useVerboseLoginView'>\n" +
    "        {{'Red Hat Access makes it easy for you to self-solve issues, diagnose problems, and engage with us via the Red Hat Customer Portal. To access Red Hat Customer Portal resources, you must enter valid portal credentials.'|translate}}\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"alert alert-danger\" ng-show=\"authError\">\n" +
    "            {{authError}}\n" +
    "        </div>\n" +
    "        <div class=\"form-group\" id=\"rha-login-modal-user-id\">\n" +
    "            <label for=\"rha-login-user-id\" class=\" control-label\" translate>Red Hat Login</label>\n" +
    "            <div>\n" +
    "                <input type=\"text\" class=\"form-control\" id=\"rha-login-user-id\" placeholder=\"{{'Red Hat Login'|translate}}\"  ng-model=\"user.user\" required autofocus>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"form-group\" id=\"rha-login-modal-user-pass\">\n" +
    "            <label for=\"rha-login-password\" class=\"control-label\" translate>Password</label>\n" +
    "            <div>\n" +
    "                <input type=\"password\" class=\"form-control\" id=\"rha-login-password\" placeholder=\"{{'Password'|translate}}\" ng-model=\"user.password\" required>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"form-group\" style=\"font-size:smaller\" ng-show='useVerboseLoginView'>\n" +
    "            <strong>{{'Note:'|translate}}\n" +
    "                &nbsp;</strong>{{'Red Hat Customer Portal credentials differ from the credentials used to log into this product.'|translate}}\n" +
    "        </div>\n" +
    "\n" +
    "        <!--/form-->\n" +
    "    </div>\n" +
    "    <div class=\"modal-footer\">\n" +
    "        <div class=\"form-group\" id=\"rha-login-modal-buttons\">\n" +
    "            <span class=\"pull-right\">\n" +
    "                <button class=\"btn  btn-md cancel\" ng-click=\"modalOptions.close()\" type=\"submit\" translate>Cancel</button>\n" +
    "                <button class=\"btn btn-primary btn-md login\" ng-click=\"modalOptions.ok()\" type=\"submit\" translate>Sign in</button>\n" +
    "            </span>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>");
}]);

angular.module("security/login_status.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("security/login_status.html",
    "<div ng-controller = 'SecurityController' ng-show=\"displayLoginStatus()\">\n" +
    "<span ng-show=\"securityService.loginStatus.isLoggedIn\" class=\"pull-right rha-logged-in\"> {{'Logged into the Red Hat Customer Portal as'|translate}} {{securityService.loginStatus.loggedInUser}} &nbsp;|&nbsp;\n" +
    "    <span ng-if=\"securityService.logoutURL.length === 0\">\n" +
    "        <a href=\"\" ng-click=\"securityService.logout()\"> Log out</a>\n" +
    "    </span>\n" +
    "    <span ng-if=\"securityService.logoutURL.length > 0\">\n" +
    "        <a href=\"{{securityService.logoutURL}}\"> Log out</a>\n" +
    "    </span>\n" +
    "</span>\n" +
    "<span ng-show=\"!securityService.loginStatus.isLoggedIn\" class=\"pull-right rha-logged-out\"> {{'Not Logged into the Red Hat Customer Portal'|translate}}&nbsp;|&nbsp;\n" +
    "    <span ng-if=\"securityService.loginURL.length === 0\">\n" +
    "        <a href=\"\" ng-click=\"securityService.login()\"> {{'Log In'|translate}}</a>\n" +
    "    </span>\n" +
    "    <span ng-if=\"securityService.loginURL.length > 0\">\n" +
    "        <a href=\"{{securityService.loginURL}}\"> {{'Log In'|translate}}</a>\n" +
    "    </span>\n" +
    "</span>\n" +
    "\n" +
    "</div>\n" +
    "");
}]);

angular.module("search/views/accordion_search.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/accordion_search.html",
    "<div class=\"container-fluid rha-side-padding\">\n" +
    "    <div rha-header title=\"Search\"></div>\n" +
    "    <div class=\"row\" rha-searchform ng-controller='SearchController'></div>\n" +
    "    <div style=\"padding-top: 10px;\"></div>\n" +
    "    <div class='row'>\n" +
    "    	<div class=\"container\" rha-accordionsearchresults='' ng-controller='SearchController' />\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("search/views/accordion_search_results.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/accordion_search_results.html",
    "<div class=\"row rha-bottom-border\">\n" +
    "    <div class=\"col-xs-6\">\n" +
    "        <div style=\"padding-bottom: 0\">\n" +
    "            <span>\n" +
    "                <h4 style=\"padding-left: 10px; display: inline-block;\" translate=''>Recommendations</h4>\n" +
    "            </span>\n" +
    "            <span ng-show=\"searchInProgress.value\" class=\"rha-search-spinner\">\n" +
    "                &nbsp;\n" +
    "            </span>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div style=\"padding-bottom: 14px;\" class=\"col-xs-6\" ng-show=\"showOpenCaseBtn()\">\n" +
    "        <a href={{getOpenCaseRef()}} class=\"btn btn-primary pull-right \">{{'Open a New Support Case'|translate}}</a>\n" +
    "    </div>\n" +
    "</div>\n" +
    "<div class=\"\">\n" +
    "    <!--div class=\"col-xs-12\" style=\"overflow: auto;\" rha-resizable rha-dom-ready=\"domReady\"-->\n" +
    "        <accordion>\n" +
    "            <accordion-group is-open=\"isopen\" ng-click=\"triggerAnalytics($event)\" ng-repeat=\"result in results\">\n" +
    "                <accordion-heading>\n" +
    "                    <span class=\"pull-left glyphicon\" ng-class=\"{'glyphicon-chevron-down': isopen, 'glyphicon-chevron-right': !isopen}\"></span>\n" +
    "                    <span>&nbsp{{result.title}}</span>\n" +
    "                </accordion-heading>\n" +
    "                <div rha-resultdetaildisplay result='result' />\n" +
    "            </accordion-group>\n" +
    "        </accordion>\n" +
    "    <!--/div-->\n" +
    "</div>\n" +
    "");
}]);

angular.module("search/views/list_search_results.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/list_search_results.html",
    "<div class=\"col-sm-4\">\n" +
    "    <div class=\"panel panel-default\" ng-show='results.length > 0'>\n" +
    "        <!--pagination on-select-page=\"pageChanged(page)\" total-items=\"totalItems\" page=\"currentPage\" max-size=\"maxSize\"></pagination-->\n" +
    "\n" +
    "        <div class=\"panel-heading\">\n" +
    "            <h4 class=\"panel-title\" translate=''>\n" +
    "                Recommendations\n" +
    "            </h4>\n" +
    "        </div>\n" +
    "        <div id='solutions' class=\"list-group\">\n" +
    "            <a href=\"\" ng-click=\"solutionSelected($index)\" class='list-group-item' ng-class=\"{'active': selectedSolution.index===$index}\" ng-repeat=\"result in results\" style=\"word-wrap: break-word;\"> <i class=\"glyphicon glyphicon-chevron-right pull-right\"></i>{{ result.title }}</a>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "<div class=\"col-sm-8\" style=\"overflow: auto;\" rha-resizable rha-domready=\"domReady\">\n" +
    "    <div class=\"alert alert-info\" ng-show='selectedSolution.index === -1 && results.length > 0'>\n" +
    "        {{'To view a recommendation, click on it.'|translate}}\n" +
    "    </div>\n" +
    "    <div style \"overflow: vertical;\">\n" +
    "        <div rha-resultdetaildisplay result='selectedSolution.data' />\n" +
    "    </div>\n" +
    "</div>");
}]);

angular.module("search/views/resultDetail.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/resultDetail.html",
    "<div class='panel' style='border:0' ng-model=\"result\" >\n" +
    "	<div ng-if=\"isSolution()\">\n" +
    "		<h3 translate=''>Environment</h3>\n" +
    "		<div ng-bind-html='result.environment.html'></div>\n" +
    "		<h3>Issue</h3>\n" +
    "		<div ng-bind-html='result.issue.html'></div>\n" +
    "		<div ng-if=\"getSolutionResolution() !== ''\">\n" +
    "			<h3  translate=''>Resolution</h3>\n" +
    "		</div>\n" +
    "		<div ng-bind-html='getSolutionResolution()'></div>\n" +
    "	</div>\n" +
    "	<div ng-if=\"isArticle()\">\n" +
    "		<div ng-bind-html='getArticleHtml()'></div>\n" +
    "	</div>\n" +
    "</div>\n" +
    "\n" +
    "");
}]);

angular.module("search/views/search.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/search.html",
    "<div rha-standardsearch/>\n" +
    "");
}]);

angular.module("search/views/search_form.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/search_form.html",
    "<div class='col-sm-4 pull-left'>\n" +
    "    <form role=\"form\" id=\"rh-search\">\n" +
    "        <div ng-class=\"{'col-sm-8': searchInProgress.value}\">\n" +
    "            <div class=\"input-group\">\n" +
    "                <input type=\"text\" class=\"form-control\" id=\"rhSearchStr\" name=\"searchString\" ng-model=\"searchStr\" class=\"input-xxlarge\" placeholder=\"Search Articles and Solutions\">\n" +
    "                <span class=\"input-group-btn\">\n" +
    "                    <button ng-disabled=\"(searchStr === undefined || searchStr.trim()==='' || searchInProgress.value === true)\" class=\"btn btn-default btn-primary\" type='submit' ng-click=\"search(searchStr)\">\n" +
    "                        <i class=\"glyphicon glyphicon-search \"></i>\n" +
    "                        {{'Search'|translate}}</button>\n" +
    "                </span>\n" +
    "\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"col-sm-4 \" ng-show=\"searchInProgress.value\">\n" +
    "            <span class=\"rha-search-spinner\">\n" +
    "                &nbsp;\n" +
    "            </span>\n" +
    "        </div>\n" +
    "\n" +
    "    </form>\n" +
    "</div>");
}]);

angular.module("search/views/standard_search.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/standard_search.html",
    "<div class=\"container-fluid rha-side-padding\" ng-controller='SearchController'>\n" +
    "    <div rha-header page=\"search\"></div>\n" +
    "    <div class=\"row\" rha-searchform></div>\n" +
    "    <div style=\"padding-top: 10px;\"></div>\n" +
    "    <div class='row' rha-listsearchresults='' ng-controller='SearchController' />\n" +
    "</div>\n" +
    "");
}]);

angular.module("cases/views/accountSelect.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/accountSelect.html",
    "<div style=\"display: inline-block; padding-right: 10px;\"><input style=\"width: 100%\" ng-model=\"CaseService.account.number\" ng-blur=\"populateAccountSpecificFields()\" class=\"form-control\"/></div><div style=\"display: inline-block;\"><button ng-click=\"selectUserAccount()\" ng-hide=\"loadingAccountNumber\" translate=\"\" class=\"btn btn-secondary\">My Account</button><span ng-show=\"loadingAccountNumber\" class=\"rha-search-spinner\">&nbsp;</span></div>");
}]);

angular.module("cases/views/addCommentSection.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/addCommentSection.html",
    "<div style=\"margin-left: 60px; margin-right: 60px;\"><div style=\"margin-bottom: 10px;\" class=\"well\"><textarea ng-disabled=\"addingComment\" rows=\"5\" ng-model=\"CaseService.commentText\" style=\"max-width: 100%\" ng-keypress=\"onNewCommentKeypress()\" class=\"form-control\"></textarea><div style=\"padding-top: 10px;\"><span class=\"hidden\">{{'You have used 0% of the 32KB maximum description size.'|translate}}</span><span ng-show=\"savingDraft\" class=\"pull-right rha-bold\">{{'Saving draft...'|translate}}</span><span ng-show=\"draftSaved\" class=\"pull-right rha-bold\">{{'Draft saved'|translate}}</span></div></div><div style=\"float: right;\"><span ng-show=\"addingComment\" class=\"rha-search-spinner\"></span><button ng-hide=\"addingComment\" ng-disabled=\"false\" ng-click=\"addComment()\" style=\"float: right;\" translate=\"\" class=\"btn btn-primary\">Add Comment</button></div></div>");
}]);

angular.module("cases/views/attachLocalFile.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/attachLocalFile.html",
    "<div class=\"container-fluid\"><div class=\"row rha-create-field\"><div class=\"col-xs-6\"><button style=\"float: left;\" ng-click=\"getFile()\" ng-disabled=\"disabled\" translate=\"\" class=\"btn\">Attach local file</button><div style=\"height: 0px; width:0px; overflow:hidden;\"><input id=\"fileUploader\" type=\"file\" value=\"upload\" rha-on-change=\"selectFile\" ng-model=\"file\" ng-disabled=\"disabled\"/></div></div><div class=\"col-xs-6\"><div style=\"float: left; word-wrap: break-word; width: 100%;\">{{fileName}}</div></div></div><div class=\"row rha-create-field\"><div style=\"font-size: 80%;\" class=\"col-xs-12\"><span>{{'File names must be less than 80 characters. Maximum file size for web-uploaded attachments is 250 MB. Please FTP larger files to dropbox.redhat.com.'|translate}}&nbsp;</span><span><a href=\"https://access.devgssci.devlab.phx1.redhat.com/knowledge/solutions/2112\">(More info)</a></span></div></div><div class=\"row rha-create-field\"><div class=\"col-xs-12\"><input style=\"float: left;\" placeholder=\"File description\" ng-model=\"fileDescription\" ng-disabled=\"disabled\" class=\"form-control\"/></div></div><div class=\"row rha-create-field\"><div class=\"col-xs-12\"><button ng-disabled=\"fileName == NO_FILE_CHOSEN || disabled\" style=\"float: right;\" ng-click=\"addFile(fileUploaderForm)\" translate=\"\" class=\"btn\">Add</button></div></div></div>");
}]);

angular.module("cases/views/attachProductLogs.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/attachProductLogs.html",
    "<div class=\"container-fluid\"><div class=\"row rha-create-field\"><div class=\"col-xs-12\"><div style=\"padding-bottom: 4px;\">{{'Attach Foreman logs:'|translate}}</div><select multiple=\"multiple\" class=\"form-control\"><option>Log1</option><option>Log2</option><option>Log3</option><option>Log4</option><option>Log5</option><option>Log6</option></select></div></div><div class=\"row rha-create-field\"><div class=\"col-xs-12\"><button ng-disabled=\"true\" style=\"float: right;\" translate=\"\" class=\"btn\">Add</button></div></div></div>");
}]);

angular.module("cases/views/attachmentsSection.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/attachmentsSection.html",
    "<h4 translate=\"\" class=\"rha-section-header\">Attachments</h4><span ng-show=\"loading\" class=\"rha-search-spinner\"></span><div ng-hide=\"loading\" class=\"container-fluid rha-side-padding\"><div class=\"row rha-side-padding\"><div class=\"col-xs-12 rha-col-no-padding\"><div rha-listattachments=\"\"></div></div></div><div style=\"border-top: 1px solid #cccccc; padding-top: 10px; margin: 0;\" class=\"row\"></div><div ng-hide=\"AttachmentsService.updatedAttachments.length &lt;= 0 &amp;&amp; TreeViewSelectorUtils.getSelectedLeaves(AttachmentsService.backendAttachments).length &lt;= 0\"><div class=\"row rha-side-padding\"><div class=\"col-xs-12 rha-col-no-padding\"><div rha-listnewattachments=\"rha-listnewattachments\"></div></div></div><div class=\"row rha-side-padding\"><div style=\"padding-bottom: 14px;\" class=\"col-xs-12 rha-col-no-padding\"><div style=\"float: right\"><span ng-show=\"updatingAttachments\" class=\"rha-search-spinner\"></span><button ng-hide=\"updatingAttachments\" ng-click=\"doUpdate()\" translate=\"\" class=\"btn btn-primary\">Upload Attachments</button></div></div></div><div style=\"border-top: 1px solid #cccccc; padding-top: 10px; margin: 0;\" class=\"row\"></div></div><div class=\"row\"><div class=\"col-xs-12\"><div rha-attachlocalfile=\"\"></div></div></div><div ng-show=\"showServerSideAttachments\"><div class=\"row\"><div class=\"col-xs-12\"><div class=\"server-attach-header\">{{'Server File(s) To Attach:'|translate}}</div><div rha-choicetree=\"\" ng-model=\"attachmentTree\" ng-controller=\"BackEndAttachmentsCtrl\" rhaDisabled=\"rhaDisabled\"></div></div></div></div></div>");
}]);

angular.module("cases/views/chatButton.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/chatButton.html",
    "<div ng-show=\"showChat\"><iframe style=\"display: none;\" ng-src=\"{{chatHackUrl}}\"></iframe><button ng-show=\"chatAvailable\" ng-click=\"openChatWindow()\" translate=\"\" class=\"btn btn-primary\">Chat with support</button><button ng-show=\"!chatAvailable\" disabled=\"disabled\" translate=\"\" class=\"btn btn-secondary\">Chat offline</button></div>");
}]);

angular.module("cases/views/commentsSection.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/commentsSection.html",
    "<h4 translate=\"\" class=\"rha-section-header\">Case Discussion</h4><span ng-show=\"loading\" class=\"rha-search-spinner\"></span><div ng-hide=\"loading\" class=\"container-fluid rha-side-padding\"><div class=\"row rha-create-field\"><div class=\"col-xs-12\"><div rha-addcommentsection=\"\"></div></div></div><div style=\"border-top: 1px solid #cccccc; padding-top: 10px; padding-bottom: 10px;\" class=\"row\"><div class=\"col-xs-12\"><span style=\"display: inline-block; padding-right: 10px;\">{{'Would you like a Red Hat support manager to contact you regarding this case?'|translate}}</span><button style=\"display: inline-block\" ng-click=\"requestManagementEscalation()\" translate=\"\" class=\"btn btn-secondary\">Request Management Escalation</button></div></div><div ng-hide=\"CaseService.comments.length &lt;= 0 || CaseService.comments === undefined\" style=\"border-top: 1px solid #dddddd;\"><div style=\"padding-top: 10px; padding-bottom: 10px;\" class=\"row\"><div class=\"col-xs-12\"><pagination style=\"float: right;\" boundary-links=\"true\" total-items=\"CaseService.comments.length\" on-select-page=\"selectPage(page)\" items-per-page=\"itemsPerPage\" page=\"currentPage\" rotate=\"false\" max-size=\"maxPagerSize\" previous-text=\"&lt;\" next-text=\"&gt;\" first-text=\"&lt;&lt;\" last-text=\"&gt;&gt;\" class=\"pagination-sm\"></pagination></div></div><div ng-repeat=\"comment in commentsOnScreen\" ng-if=\"!comment.draft\"><div style=\"padding-bottom: 10px;\" class=\"row\"><div class=\"col-md-2\"><div class=\"rha-bold\">{{comment.created_by}}</div><div>{{comment.created_date | date:'mediumDate'}}</div><div>{{comment.created_date | date:'h:mm:ss a Z'}}</div></div><div class=\"col-md-10\"><pre style=\"word-break: normal;\">{{comment.text}}</pre></div></div></div></div></div>");
}]);

angular.module("cases/views/compact.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/compact.html",
    "<div class=\"container-offset\">\n" +
    "    <div class=\"container-fluid\">\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"col-xs-12\">\n" +
    "                <div rha-header page=\"caseList\"/>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"col-xs-4\" style=\"height: 100%;\">\n" +
    "                <div rha-compactcaselist></div>\n" +
    "            </div>\n" +
    "            <div class=\"col-xs-8\" style=\"padding: 0px; \">\n" +
    "                <!-- Jade can't create the ui-view attribute in the form\n" +
    "                     angular ui router requires (see next line).-->\n" +
    "                <div ui-view autoscroll=\"false\"></div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("cases/views/compactCaseList.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/compactCaseList.html",
    "<div id=\"redhat-access-case\"><div id=\"redhat-access-compact-list\" class=\"container-fluid\"><div class=\"row\"><div class=\"col-xs-12 rha-col-no-padding\"><div rha-listfilter=\"\"></div></div></div><div class=\"row\"><div class=\"col-xs-12\"><div ng-show=\"SearchCaseService.cases.length == 0 &amp;&amp; !SearchCaseService.searching &amp;&amp; securityService.loginStatus.isLoggedIn\">{{'No cases found with given filters.'|translate}}</div><span ng-show=\"SearchCaseService.searching &amp;&amp; securityService.loginStatus.isLoggedIn\" class=\"rha-search-spinner\"></span></div></div><div ng-hide=\"SearchCaseService.cases.length == 0 || SearchCaseService.searching\" style=\"border-top: 1px solid #dddddd;\" class=\"row\"><div style=\"overflow: auto;\" rha-resizable=\"rha-resizable\" rha-domready=\"domReady\" class=\"col-xs-12 rha-col-no-padding\"><div style=\"margin-bottom: 0px; overflow: auto;\"><ul style=\"margin-bottom: 0px;\" class=\"list-group\"><a ng-repeat=\"case in SearchCaseService.cases\" ui-sref=\".edit({id: &quot;{{case.case_number}}&quot;})\" ng-class=\"{&quot;active&quot;: $index == selectedCaseIndex}\" ng-click=\"selectCase($index)\" class=\"list-group-item\">{{case.case_number}} {{case.summary}}</a></ul></div></div></div></div></div>");
}]);

angular.module("cases/views/compactEdit.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/compactEdit.html",
    "<!DOCTYPE html><div id=\"redhat-access-case\"><div ng-show=\"caseLoading &amp;&amp; securityService.loginStatus.isLoggedIn\" class=\"container-fluid\"><div style=\"margin-right: 0px;\" class=\"row\"><div class=\"col-xs-12\"><span class=\"rha-search-spinner\"></span></div></div></div><div ng-hide=\"caseLoading\" rha-resizable rha-dom-ready=\"domReady\" style=\"overflow: auto; padding-left: 15px;border-top: 1px solid #dddddd; border-left: 1px solid #dddddd;\" class=\"container-fluid\"><div style=\"margin-right: 0px; padding-top: 10px;\" class=\"row\"><div class=\"col-xs-12\"><div rha-casedetails=\"\" compact=\"true\"></div></div></div><div style=\"margin-right: 0px;\" class=\"row\"><div class=\"col-xs-12\"><div rha-case-description=\"\"></div></div></div><div style=\"margin-right: 0px;\" class=\"row\"><div class=\"col-xs-12\"><div rha-case-attachments=\"\"></div></div></div><div style=\"margin-right: 0px;\" class=\"row\"><div class=\"col-xs-12\"><div rha-case-comments=\"\"></div></div></div></div></div>");
}]);

angular.module("cases/views/createGroupButton.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/createGroupButton.html",
    "<button ng-click=\"openCreateGroupDialog()\" translate=\"\" class=\"btn btn-primary\">Create New Case Group</button>");
}]);

angular.module("cases/views/createGroupModal.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/createGroupModal.html",
    "<div id=\"rha-create-group-modal\"><div class=\"modal-header\"><h3 translate=\"\">Create Case Group</h3></div><div style=\"padding: 20px;\" class=\"container-fluid\"><div style=\"padding-bottom: 20px;\" class=\"row\"><div class=\"col-sm-12\"><div style=\"display: table; width: 100%;\"><label style=\"display: table-cell\" translate=\"\">Case Group:</label><input ng-model=\"groupName\" style=\"display: table-cell; width: 100%;\" ng-keypress=\"onGroupNameKeyPress($event)\" class=\"form-control\"/></div></div></div><div class=\"row\"><div class=\"col-sm-12\"><button ng-click=\"createGroup()\" style=\"margin-left: 10px;\" translate=\"\" class=\"btn-primary btn pull-right\">Save</button><button ng-click=\"closeModal()\" translate=\"\" class=\"btn-secondary btn pull-right\">Cancel</button></div></div></div></div>");
}]);

angular.module("cases/views/deleteGroupButton.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/deleteGroupButton.html",
    "<button ng-click=\"deleteGroups()\" translate=\"\" class=\"btn btn-secondary\">Delete Group</button>");
}]);

angular.module("cases/views/descriptionSection.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/descriptionSection.html",
    "<h4 translate=\"\" class=\"rha-section-header\">Description</h4><span ng-show=\"loading\" class=\"rha-search-spinner\"></span><div ng-hide=\"loading\" class=\"container-fluid rha-side-padding\"><div class=\"row\"><div class=\"col-md-2\"><strong>{{CaseService.kase.created_by}}</strong></div><div class=\"col-md-10\">{{CaseService.kase.description}}</div></div></div>");
}]);

angular.module("cases/views/detailsSection.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/detailsSection.html",
    "<form name=\"caseDetails\"><div style=\"display: table; width: 100%; padding-bottom: 20px;\"><div style=\"display: table-cell; width: 50%;\"><div><h3 style=\"margin-top: 0px;\">Case {{CaseService.kase.case_number}}</h3></div><input style=\"width: 100%; display: inline-block;\" ng-model=\"CaseService.kase.summary\" name=\"summary\" class=\"form-control\"/><span ng-show=\"caseDetails.summary.$dirty\" style=\"display: inline-block;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></div><div ng-show=\"showEmailNotifications\" style=\"display: table-cell; vertical-align: bottom; width: 50%;\"><div style=\"width: 75%\" class=\"pull-right\"><div rha-emailnotifyselect=\"\"></div></div></div></div><span ng-show=\"loading\" class=\"rha-search-spinner\"></span><div ng-hide=\"loading\" class=\"container-fluid rha-side-padding\"><div id=\"rha-case-details\" class=\"row\"><div class=\"col-sm-12 rha-section-header\"><h4 translate=\"\">Details</h4></div><div class=\"container-fluid rha-side-padding\"><div class=\"row\"><div class=\"col-md-4\"><table class=\"table details-table\"><tr ng-hide=\"compact\"><th class=\"rha-detail-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">{{'Case Type:'|translate}}</div><span ng-show=\"caseDetails.type.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><div rha-selectloadingindicator=\"\" loading=\"caseTypes === undefined\" type=\"bootstrap\"><select name=\"type\" style=\"width: 100%;\" ng-model=\"CaseService.kase.type\" ng-options=\"c.name for c in caseTypes track by c.name\" class=\"form-control\"></select></div></td></tr><tr><th class=\"rha-detail-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">{{'Severity:'|translate}}</div><span ng-show=\"caseDetails.severity.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><div rha-selectloadingindicator=\"\" loading=\"CaseService.severities === undefined\" type=\"bootstrap\"><select name=\"severity\" style=\"width: 100%;\" ng-model=\"CaseService.kase.severity\" ng-options=\"s.name for s in CaseService.severities track by s.name\" class=\"form-control\"></select></div></td></tr><tr ng-show=\"CaseService.showFts()\"><th class=\"rha-detail-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">{{'24x7 Support:'|translate}}</div></th><td><input ng-model=\"CaseService.kase.fts\" type=\"checkbox\"/></td></tr><tr ng-show=\"CaseService.showFts() &amp;&amp; CaseService.kase.fts\"><th class=\"rha-detail-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">{{'24x7 Contact:'|translate}}</div></th><td><input ng-model=\"CaseService.kase.contact_info24_x7\" class=\"form-control\"/></td></tr><tr><th class=\"rha-detail-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">{{'Status:'|translate}}</div><span ng-show=\"caseDetails.status.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><div rha-selectloadingindicator=\"\" loading=\"statuses === undefined\" type=\"bootstrap\"><select name=\"status\" style=\"width: 100%;\" ng-model=\"CaseService.kase.status\" ng-options=\"s.name for s in statuses track by s.name\" class=\"form-control\"></select></div></td></tr><tr ng-hide=\"compact\"><th class=\"rha-detail-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">{{'Alternate ID:'|translate}}</div><span ng-show=\"caseDetails.alternate_id.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><input style=\"width: 100%\" ng-model=\"CaseService.kase.alternate_id\" name=\"alternate_id\" class=\"form-control\"/></td></tr></table></div><div class=\"col-md-4\"><table class=\"table details-table\"><tr><th><div style=\"vertical-align: 50%; display: inline-block;\">{{'Product:'|translate}}</div><span ng-show=\"caseDetails.product.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><div rha-selectloadingindicator=\"\" loading=\"products === undefined\" type=\"bootstrap\"><select name=\"product\" style=\"width: 100%;\" ng-model=\"CaseService.kase.product\" ng-change=\"getProductVersions()\" ng-options=\"s.name for s in products track by s.name\" required=\"required\" class=\"form-control\"></select></div></td></tr><tr><th class=\"rha-detail-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">{{'Product Version:'|translate}}</div><span ng-show=\"caseDetails.version.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><div rha-selectloadingindicator=\"\" loading=\"CaseService.versions.length === 0\" type=\"bootstrap\"><select name=\"version\" style=\"width: 100%;\" ng-options=\"v for v in CaseService.versions track by v\" ng-model=\"CaseService.kase.version\" required=\"required\" class=\"form-control\"></select></div></td></tr><tr ng-hide=\"compact\"><th class=\"rha-detail-table-header\">{{'Support Level:'|translate}}</th><td>{{CaseService.kase.entitlement.sla}}</td></tr><tr ng-hide=\"compact\"><th class=\"rha-detail-table-header\">{{'Owner:'|translate}}</th><td>{{CaseService.kase.contact_name}}</td></tr><tr ng-hide=\"compact\"><th class=\"rha-detail-table-header\">{{'Red Hat Owner:'|translate}}</th><td>{{CaseService.kase.owner}}</td></tr></table></div><div class=\"col-md-4\"><table class=\"table details-table\"><tr ng-hide=\"compact\"><th class=\"rha-detail-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">{{'Group:'|translate}}</div><span ng-show=\"caseDetails.group.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><div rha-selectloadingindicator=\"\" loading=\"groups === undefined\" type=\"bootstrap\"><select name=\"group\" style=\"width: 100%;\" ng-options=\"g.name for g in groups track by g.number\" ng-model=\"CaseService.kase.group\" class=\"form-control\"></select></div></td></tr><tr ng-hide=\"compact\"><th class=\"rha-detail-table-header\">{{'Opened:'|translate}}</th><td><div>{{CaseService.kase.created_date | date:'MMM d, y h:mm:ss a Z'}}</div><div>{{CaseService.kase.created_by}}</div></td></tr><tr ng-hide=\"compact\"><th class=\"rha-detail-table-header\">{{'Last Updated:'|translate}}</th><td><div>{{CaseService.kase.last_modified_date | date:'MMM d, y h:mm:ss a Z'}}</div><div>{{CaseService.kase.last_modified_by}}</div></td></tr><tr ng-hide=\"compact\"><th class=\"rha-detail-table-header\">{{'Account Number:'|translate}}</th><td>{{CaseService.kase.account_number}}</td></tr><tr ng-hide=\"compact\"><th class=\"rha-detail-table-header\">{{'Account Name:'|translate}}</th><td>{{CaseService.account.name}}</td></tr></table></div></div><div style=\"padding-top: 10px;\" class=\"row\"><div class=\"col-xs-12\"><div style=\"float: right;\"><button name=\"updateButton\" ng-disabled=\"!caseDetails.$dirty\" ng-hide=\"updatingDetails\" ng-click=\"updateCase()\" translate=\"\" class=\"btn btn-primary\">Update Details</button><span ng-show=\"updatingDetails\" class=\"rha-search-spinner\"></span></div></div></div></div></div></div></form>");
}]);

angular.module("cases/views/edit.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/edit.html",
    "<!DOCTYPE html><div id=\"redhat-access-case\" class=\"container-offset\"><div rha-header=\"\" page=\"caseView\"></div><div ng-show=\"securityService.loginStatus.isLoggedIn\" class=\"container-fluid rha-side-padding\"><div ng-show=\"securityService.loginStatus.isLoggedIn &amp;&amp; securityService.loginStatus.hasChat\" class=\"row\"><div class=\"pull-right\"><div rha-chatbutton=\"\"></div></div></div><div ng-show=\"EDIT_CASE_CONFIG.showDetails\" class=\"row\"><div class=\"col-xs-12\"><div rha-casedetails=\"\" compact=\"false\" loading=\"caseLoading\"></div></div></div><div ng-show=\"EDIT_CASE_CONFIG.showDescription\" class=\"row\"><div class=\"col-xs-12\"><div rha-casedescription=\"\" loading=\"caseLoading\"></div></div></div><div ng-show=\"EDIT_CASE_CONFIG.showBugzillas\" class=\"row\"><div class=\"col-xs-12\"><div rha-listbugzillas=\"\" loading=\"caseLoading\"></div></div></div><div ng-show=\"EDIT_CASE_CONFIG.showAttachments\" class=\"row\"><div class=\"col-xs-12\"><div rha-caseattachments=\"\" loading=\"attachmentsLoading\"></div></div></div><div ng-show=\"EDIT_CASE_CONFIG.showRecommendations\" class=\"row\"><div class=\"col-xs-12\"><div rha-caserecommendations=\"\" loading=\"recommendationsLoading\"></div></div></div><div ng-show=\"EDIT_CASE_CONFIG.showComments\" class=\"row\"><div class=\"col-xs-12\"><div rha-casecomments=\"\" loading=\"commentsLoading\"></div></div></div></div></div>");
}]);

angular.module("cases/views/emailNotifySelect.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/emailNotifySelect.html",
    "<h4 translate=\"\" class=\"rha-section-header\">Email Notification Recipients</h4><span ng-show=\"!securityService.loginStatus.isLoggedIn  || CaseService.usersLoading || securityService.loggingIn\" style=\"margin-left: 5px;\" class=\"rha-search-spinner\"></span><select ui-select2=\"ui-select2\" multiple=\"multiple\" ng-show=\"securityService.userAllowedToManageEmailNotifications() &amp;&amp; securityService.loginStatus.isLoggedIn &amp;&amp; !CaseService.usersLoading &amp;&amp; !securityService.loggingIn\" ng-disabled=\"updatingList\" ng-model=\"CaseService.updatedNotifiedUsers\" ng-change=\"updateNotifyUsers()\" id=\"rha-email-notify-select\" style=\"width: 100%\"><option ng-repeat=\"user in CaseService.users\">{{user.sso_username}}</option></select><div ng-if=\"!securityService.userAllowedToManageEmailNotifications() &amp;&amp; !securityService.loggingIn\"><div style=\"display: inline-block; width: 100%; padding: 6px;\" class=\"well\"><span ng-repeat=\"user in CaseService.updatedNotifiedUsers\" style=\"display: inline-block; word-wrap: break-word; padding: 4px; margin: 2px;\" class=\"well well-sm\">{{user}}</span></div></div>");
}]);

angular.module("cases/views/entitlementSelect.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/entitlementSelect.html",
    "<div rha-selectloadingindicator=\"\" loading=\"CaseService.entitlementsLoading\" type=\"select2\"><select ui-select2=\"ui-select2\" ng-disabled=\"!securityService.loginStatus.isLoggedIn\" ng-model=\"CaseService.entitlement\" ng-change=\"CaseService.onSelectChanged()\" style=\"width: 100%\"><option ng-repeat=\"entitlement in CaseService.entitlements\">{{entitlement}}</option></select></div>");
}]);

angular.module("cases/views/exportCSVButton.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/exportCSVButton.html",
    "<button ng-click=\"exports()\" ng-hide=\"exporting\" translate=\"\" class=\"btn btn-secondary\">Export All as CSV</button><div ng-show=\"exporting\"><span class=\"rha-search-spinner\"></span><span>{{'Exporting CSV...'|translate}}</span></div>");
}]);

angular.module("cases/views/group.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/group.html",
    "<div id=\"redhat-access-case\" class=\"container-offset\"><div rha-header=\"\" page=\"manageGroups\"></div><div ng-show=\"securityService.loginStatus.isLoggedIn\" class=\"container-fluid rha-side-padding\"><div style=\"padding-bottom: 20px;\" class=\"row\"><div class=\"col-xs-6\"><div rha-searchbox=\"\" placeholder=\"&quot;Search Groups&quot;\"></div></div><div class=\"col-xs-6\"><div rha-creategroupbutton=\"\" class=\"pull-right\"></div><div rha-deletegroupbutton=\"\" style=\"padding-right: 20px;\" class=\"pull-right\"></div></div></div><div class=\"row\"><div class=\"col-xs-12\"><div rha-grouplist=\"\"></div></div></div></div></div>");
}]);

angular.module("cases/views/groupList.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/groupList.html",
    "<span ng-show=\"groupsLoading\" class=\"rha-search-spinner\"></span><div ng-show=\"!groupsLoading &amp;&amp; listEmpty\">{{'No groups found.'|translate}}</div><div ng-hide=\"groupsLoading || listEmpty\"><table ng-table=\"tableParams\" class=\"table table-bordered table-striped\"><thead style=\"text-align: center\"><th><input type=\"checkbox\" style=\"width: 25px;\" ng-model=\"masterSelected\" ng-change=\"onMasterCheckboxClicked()\"/></th><th ng-class=\"{&quot;sort-asc&quot;: table-params.isSortBy(&quot;name&quot;, &quot;asc&quot;), &quot;sort-desc&quot;: tableParams.isSortBy(&quot;name&quot;, &quot;desc&quot;)}\" ng-click=\"tableParams.sorting({&quot;name&quot;: tableParams.isSortBy(&quot;name&quot;, &quot;asc&quot;) ? &quot;desc&quot; : &quot;asc&quot;})\" class=\"sortable\"><div>{{'Name'|translate}}</div></th></thead><tbody><tr ng-repeat=\"group in GroupService.groupsOnScreen\"><td style=\"text-align: center; width: 25px;\"><input type=\"checkbox\" ng-model=\"group.selected\"/></td><td data-title=\"&quot;Group Name&quot;\" sortable=\"&quot;name&quot;\"><div>{{group.name}}</div></td></tr></tbody></table></div>");
}]);

angular.module("cases/views/groupSelect.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/groupSelect.html",
    "<div rha-selectloadingindicator=\"\" loading=\"CaseService.groupsLoading\" type=\"select2\"><select ui-select2=\"ui-select2\" ng-disabled=\"!securityService.loginStatus.isLoggedIn\" ng-model=\"CaseService.group\" ng-change=\"CaseService.onGroupSelectChanged()\" placeholder=\"Select a Group\" style=\"width: 100%\"><option value=\"\" ng-if=\"showsearchoptions\">All Groups</option><option value=\"{{CASE_GROUPS.ungrouped}}\" ng-if=\"showsearchoptions\">Ungrouped Cases</option><option disabled=\"disabled\" ng-hide=\"CaseService.groups.length &lt; 1\" ng-if=\"showsearchoptions\">────────────────────────────────────────</option><option ng-repeat=\"group in CaseService.groups\" value=\"{{group.number}}\">{{group.name}}</option><option ng-if=\"securityService.userAllowedToManageGroups() &amp;&amp; showsearchoptions\" disabled=\"disabled\">────────────────────────────────────────</option><option ng-if=\"securityService.userAllowedToManageGroups() &amp;&amp; showsearchoptions\" value=\"{{CASE_GROUPS.manage}}\">Manage Case Groups</option></select></div>");
}]);

angular.module("cases/views/list.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/list.html",
    "<div id=\"redhat-access-case\" style=\"padding-bottom: 15px;\" class=\"container-offset\"><div rha-header=\"\" page=\"caseList\"></div><div class=\"container-fluid rha-side-padding\"><div class=\"row\"><div class=\"col-md-6\"><div rha-listfilter=\"\"></div></div><div class=\"col-md-3\"><div class=\"pull-right\"><div rha-chatbutton=\"\"></div></div></div><div class=\"col-md-3\"><button ng-disabled=\"!securityService.loginStatus.isLoggedIn\" ui-sref=\"new\" translate=\"\" class=\"btn btn-primary pull-right\">Open a New Support Case</button></div></div></div><div style=\"margin-left: 10px; margin-right: 10px;\" class=\"rha-bottom-border\"></div><div class=\"container-fluid rha-side-padding\"><div ng-show=\"SearchCaseService.searching &amp;&amp; securityService.loginStatus.isLoggedIn\" class=\"row\"><div class=\"col-xs-12\"><span class=\"rha-search-spinner\"></span></div></div><div ng-show=\"SearchCaseService.cases.length == 0 &amp;&amp; !SearchCaseService.searching &amp;&amp; securityService.loginStatus.isLoggedIn\" class=\"row\"><div class=\"col-xs-12\"><div>{{'No cases found with given filters.'|translate}}</div></div></div><div ng-hide=\"SearchCaseService.cases.length == 0 || SearchCaseService.searching || !securityService.loginStatus.isLoggedIn\"><div class=\"row\"><div class=\"col-xs-12\"><table ng-table=\"tableParams\" style=\"text-align: left\" class=\"table table-bordered table-striped\"><tr ng-repeat=\"case in $data\"><td data-title=\"&quot;Case ID&quot;\" sortable=\"&quot;case_number&quot;\" style=\"width: 10%\"><a href=\"#/case/{{case.case_number}}\">{{case.case_number}}</a></td><td data-title=\"&quot;Summary&quot;\" sortable=\"&quot;summary&quot;\" style=\"width: 15%\">{{case.summary}}</td><td data-title=\"&quot;Product/Version&quot;\" sortable=\"&quot;product&quot;\">{{case.product}} / {{case.version}}</td><td data-title=\"&quot;Status&quot;\" sortable=\"&quot;status&quot;\">{{case.status}}</td><td data-title=\"&quot;Severity&quot;\" sortable=\"&quot;severity&quot;\">{{case.severity}}</td><td data-title=\"&quot;Owner&quot;\" sortable=\"&quot;owner&quot;\">{{case.contact_name}}</td><td data-title=\"&quot;Opened&quot;\" sortable=\"&quot;created_date&quot;\" style=\"width: 10%\">{{case.created_date | date:'longDate'}}</td><td data-title=\"&quot;Updated&quot;\" sortable=\"&quot;last_modified_date&quot;\" style=\"width: 10%\">{{case.last_modified_date | date:'longDate'}}</td></tr></table></div></div><div class=\"row\"><div class=\"col-xs-12\"><div rha-exportcsvbutton=\"\"></div></div></div></div></div></div>");
}]);

angular.module("cases/views/listAttachments.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/listAttachments.html",
    "<div ng-show=\"AttachmentsService.originalAttachments.length == 0\" style=\"padding-bottom: 10px;\">{{'No attachments added'|translate}}</div><div ng-show=\"AttachmentsService.originalAttachments.length &gt; 0\" class=\"panel panel-default\"><div class=\"panel-heading\">{{'Attached Files'|translate}}</div><table class=\"table table-hover table-bordered\"><thead><th>{{'Filename'|translate}}</th><th>{{'Description'|translate}}</th><th>{{'Size'|translate}}</th><th>{{'Attached'|translate}}</th><th>{{'Attached By'|translate}}</th><th>{{'Delete'|translate}}</th></thead><tbody><tr ng-repeat=\"attachment in AttachmentsService.originalAttachments\"><td><a ng-hide=\"attachment.uri == null\" href=\"{{attachment.uri}}\">{{attachment.file_name}}</a><div ng-show=\"attachment.uri == null\">{{attachment.file_name}}</div></td><td>{{attachment.description}}</td><td>{{attachment.length | bytes}}</td><td>{{attachment.created_date | date:'medium'}}</td><td>{{attachment.created_by}}</td><td><div ng-show=\"disabled\">{{'Delete'|translate}}</div><a ng-click=\"AttachmentsService.removeOriginalAttachment($index)\" ng-hide=\"disabled\">{{'Delete'|translate}}</a></td></tr></tbody></table></div>");
}]);

angular.module("cases/views/listBugzillas.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/listBugzillas.html",
    "<div ng-show=\"securityService.loginStatus.isInternal\" class=\"redhat-access-bz\"><h4 style=\"padding-top: 20px;\" class=\"section-header\">{{'Bugzilla Tickets'|translate}}</h4><span ng-show=\"loading\" class=\"rha-search-spinner\"></span><div ng-hide=\"CaseService.bugzillaList.bugzilla.length &gt; 0\" style=\"padding-bottom: 10px;\">{{'No linked bugzillas'|translate}}</div><div ng-show=\"CaseService.bugzillaList.bugzilla.length &gt; 0\" class=\"panel panel-default\"><table class=\"table table-hover table-bordered\"><thead><th>{{'Bugzilla Number'|translate}}</th><th>{{'Summary of Request'|translate}}</th></thead><tbody>  <tr ng-repeat=\"bugzilla in CaseService.bugzillaList.bugzilla\"><td><a href=\"{{bugzilla.resource_view_uri}}\" target=\"_blank\">{{bugzilla.bugzilla_number}}</a></td><td>{{bugzilla.summary}}</td></tr></tbody></table></div></div>");
}]);

angular.module("cases/views/listFilter.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/listFilter.html",
    "<div class=\"container-fluid\"><div class=\"row\"><div style=\"padding-bottom: 14px;\" class=\"col-md-6\"><div rha-searchbox=\"\" placeholder=\"Search\"></div></div><div style=\"padding-bottom: 14px;\" class=\"col-md-3\"><div style=\"display:table\"><div rha-groupselect=\"\" showsearchoptions=\"true\"></div><span style=\"display: table-cell; width: 1%; padding-left: 6px;\" popover=\"Filtering by case groups helps you find related cases.\" tabindex=\"0\" popover-append-to-body=\"true\" popover-trigger=\"mouseenter\" class=\"glyphicon glyphicon-question-sign\"></span></div></div><div style=\"padding-bottom: 14px;\" class=\"col-md-3\"><div rha-statusselect=\"\"></div></div></div></div>");
}]);

angular.module("cases/views/listNewAttachments.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/listNewAttachments.html",
    "<div class=\"container-fluid\"><div class=\"row\"><div class=\"col-xs-12\"><div class=\"panel panel-default\"><div class=\"panel-heading\">{{'Files to Attach'|translate}}</div><ul class=\"list-group\"><li ng-repeat=\"attachment in AttachmentsService.updatedAttachments\" ng-hide=\"AttachmentsService.updatedAttachments.length &lt;= 0\" class=\"list-group-item\">{{attachment.file_name}} ({{attachment.length | bytes}}) - {{attachment.description}}<button type=\"button\" style=\"float: right\" ng-click=\"removeLocalAttachment($index)\" class=\"close\">&times;</button></li><li ng-repeat=\"attachment in TreeViewSelectorUtils.getSelectedLeaves(AttachmentsService.backendAttachments)\" ng-hide=\"TreeViewSelectorUtils.getSelectedLeaves(AttachmentsService.backendAttachments).length &lt;= 0\" class=\"list-group-item\">{{attachment}}</li></ul></div></div></div></div>");
}]);

angular.module("cases/views/new.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/new.html",
    "<div class=\"container-offset\"><div id=\"redhat-access-case\" class=\"container-fluid\"><div rha-header=\"\" page=\"newCase\"></div><div ng-show=\"securityService.loginStatus.isLoggedIn &amp;&amp; securityService.loginStatus.hasChat\" class=\"row\"><div class=\"pull-right\"><div rha-chatbutton=\"\" style=\"margin-right: 10px;\"></div></div></div><div ng-show=\"securityService.loginStatus.isLoggedIn &amp;&amp; securityService.loginStatus.hasChat\" class=\"rha-bottom-border\"></div><div class=\"row\"><div style=\"border-right: 1px solid; border-color: #cccccc;\" class=\"col-xs-6\"><div class=\"container-fluid rha-side-padding\"><div ng-class=\"{&quot;hidden&quot;: isPage2}\" id=\"rha-case-wizard-page-1\" class=\"rha-create-case-section\"><div ng-if=\"securityService.loginStatus.isInternal\"><div class=\"row rha-create-field\"><div class=\"col-md-4\"><div>{{'Account:'|translate}}</div></div><div class=\"col-md-8\"><div rha-accountselect=\"\"></div></div></div><div class=\"row rha-create-field\"><div class=\"col-md-4\"><div>{{'Owner:'|translate}}</div></div><div class=\"col-md-8\"><div rha-ownerselect=\"\"></div></div></div></div><div class=\"row rha-create-field\"><div class=\"col-md-4\"><div>{{'Product:'|translate}}</div></div><div class=\"col-md-8\"><div rha-selectloadingindicator=\"\" loading=\"productsLoading\" type=\"bootstrap\"><select ng-disabled=\"!securityService.loginStatus.isLoggedIn || submittingCase\" style=\"width: 100%;\" ng-model=\"CaseService.kase.product\" ng-change=\"getProductVersions(CaseService.kase.product)\" ng-options=\"p.name for p in products track by p.code\" ng-blur=\"getRecommendations()\" class=\"form-control\"></select></div></div></div><div class=\"row rha-create-field\"><div class=\"col-md-4\"><div>{{'Product Version:'|translate}}</div></div><div class=\"col-md-8\"><div><div rha-selectloadingindicator=\"\" loading=\"versionLoading\" type=\"bootstrap\"><select style=\"width: 100%;\" ng-model=\"CaseService.kase.version\" ng-options=\"v for v in versions\" ng-change=\"CaseService.validateNewCasePage1()\" ng-disabled=\"versionDisabled || !securityService.loginStatus.isLoggedIn || submittingCase\" ng-blur=\"getRecommendations()\" class=\"form-control\"></select></div></div></div></div><div class=\"row rha-create-field\"><div class=\"col-md-4\"><div>{{'Summary:'|translate}}</div></div><div class=\"col-md-8\"><input id=\"rha-case-summary\" style=\"width: 100%;\" ng-disabled=\"!securityService.loginStatus.isLoggedIn\" ng-change=\"CaseService.validateNewCasePage1()\" ng-model=\"CaseService.kase.summary\" ng-blur=\"getRecommendations()\" class=\"form-control\"/></div></div><div class=\"row rha-create-field\"><div class=\"col-md-4\"><div>{{'Description:'|translate}}</div></div><div class=\"col-md-8\"><textarea style=\"width: 100%; height: 200px; max-width: 100%;\" ng-model=\"CaseService.kase.description\" ng-change=\"CaseService.validateNewCasePage1()\" ng-disabled=\"!securityService.loginStatus.isLoggedIn || submittingCase\" ng-blur=\"getRecommendations()\" class=\"form-control description-box\"></textarea></div></div><div class=\"row\"><div ng-class=\"{&quot;hidden&quot;: isPage2}\" class=\"col-xs-12\"><button style=\"float: right\" ng-click=\"doNext()\" ng-disabled=\"CaseService.newCasePage1Incomplete\" translate=\"\" class=\"btn btn-primary\">Next</button></div></div></div><div ng-class=\"{hidden: isPage1}\" id=\"rha-case-wizard-page-2\" class=\"rha-create-case-section\"><div class=\"rha-bottom-border\"><div class=\"row\"><div class=\"col-xs-12\"><div style=\"margin-bottom: 10px;\" class=\"rha-bold\">{{CaseService.kase.product.name}} {{CaseService.kase.version}}</div></div></div><div class=\"row\"><div class=\"col-xs-12\"><div style=\"font-size: 90%; margin-bottom: 4px;\" class=\"rha-bold\">{{CaseService.kase.summary}}</div></div></div><div class=\"row\"><div class=\"col-xs-12\"><div style=\"font-size: 85%\">{{CaseService.kase.description}}</div></div></div></div><div class=\"row rha-create-field\"><div class=\"col-md-4\">Support Level:</div><div ng-show=\"CaseService.entitlements.length &lt;= 1\" class=\"col-md-8\">{{CaseService.entitlements[0]}}</div><div ng-hide=\"CaseService.entitlements.length &lt;= 1\" class=\"col-md-8\"><div rha-entitlementselect=\"\"></div></div></div><div class=\"row rha-create-field\"><div class=\"col-md-4\">{{'Severity:'|translate}}</div><div class=\"col-md-8\"><div rha-loadingindicator=\"\" loading=\"severitiesLoading\"><select style=\"width: 100%;\" ng-model=\"CaseService.kase.severity\" ng-change=\"validatePage2()\" ng-disabled=\"submittingCase\" ng-options=\"s.name for s in CaseService.severities track by s.name\" class=\"form-control\"></select></div></div></div><div ng-show=\"CaseService.showFts()\" style=\"padding-left: 30px;\"><div class=\"row rha-create-field\"><div class=\"col-md-12\"><span>{{'24x7 Support:'|translate}}</span><input type=\"checkbox\" ng-model=\"CaseService.fts\" style=\"display: inline-block; padding-left: 10px;\"/></div></div><div ng-show=\"CaseService.fts\" class=\"row rha-create-field\"><div class=\"col-md-4\"><div>{{'24x7 Contact:'|translate}}</div></div><div class=\"col-md-8\"><input ng-model=\"CaseService.fts_contact\" class=\"form-control\"/></div></div></div><div class=\"row rha-create-field\"><div class=\"col-md-4\">{{'Case Group:'|translate}}</div><div class=\"col-md-8\"><div rha-groupselect=\"\" showsearchoptions=\"false\"></div></div></div><div ng-show=\"NEW_CASE_CONFIG.showAttachments\"><div class=\"row rha-create-field\"><div class=\"col-xs-12\"><div>{{'Attachments:'|translate}}</div></div></div><div class=\"rha-bottom-border\"><div style=\"overflow: auto\" class=\"row rha-create-field\"><div class=\"col-xs-12\"><div rha-listnewattachments=\"\"></div></div></div><div ng-hide=\"submittingCase\" class=\"row rha-create-field\"><div class=\"col-xs-12\"><div rha-attachlocalfile=\"\" disabled=\"submittingCase\"></div></div></div><div ng-hide=\"submittingCase\" class=\"row rha-create-field\"><div class=\"col-xs-12\"><div ng-show=\"NEW_CASE_CONFIG.showServerSideAttachments\"><div class=\"server-attach-header\">Server File(s) To Attach:<div rha-choicetree=\"\" ng-model=\"attachmentTree\" ng-controller=\"BackEndAttachmentsCtrl\"></div></div></div></div></div></div></div><div style=\"margin-top: 20px;\" class=\"row\"><div class=\"col-xs-6\"><button style=\"float: left\" ng-click=\"doPrevious()\" ng-disabled=\"submittingCase\" translate=\"\" class=\"btn btn-primary\">Previous</button></div><div class=\"col-xs-6\"><button style=\"float: right\" ng-disabled=\"submittingCase\" ng-hide=\"submittingCase\" ng-click=\"doSubmit($event)\" translate=\"\" class=\"btn btn-primary\">Submit</button><span ng-show=\"submittingCase\" style=\"float: right\" class=\"rha-search-spinner\"></span></div></div></div></div></div><div style=\"overflow: auto;\" rha-resizable=\"rha-resizable\" rha-domready=\"domReady\" ng-show=\"NEW_CASE_CONFIG.showRecommendations\" class=\"col-xs-6\"><div ng-controller=\"SearchController\" style=\"overflow: vertical;\"><div rha-accordionsearchresults=\"\"></div></div></div></div></div></div>");
}]);

angular.module("cases/views/ownerSelect.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/ownerSelect.html",
    "<div id=\"rha-owner-select\"><div rha-selectloadingindicator=\"\" loading=\"CaseService.usersLoading\" type=\"select2\"><select ui-select2=\"ui-select2\" ng-disabled=\"!securityService.loginStatus.isLoggedIn\" ng-model=\"CaseService.owner\" ng-change=\"CaseService.onOwnerSelectChanged()\" style=\"width: 100%\"><option ng-repeat=\"user in CaseService.users\">{{user.sso_username}}</option></select></div></div>");
}]);

angular.module("cases/views/productSelect.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/productSelect.html",
    "<div rha-selectloadingindicator=\"\" loading=\"productsLoading\" type=\"select2\"><select ui-select2=\"ui-select2\" ng-disabled=\"!securityService.loginStatus.isLoggedIn\" ng-model=\"CaseService.product\" ng-change=\"CaseService.onSelectChanged()\" style=\"width: 100%\"><option ng-repeat=\"product in CaseService.products\">{{product.name}}</option></select></div>");
}]);

angular.module("cases/views/recommendationsSection.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/recommendationsSection.html",
    "<div id=\"rha-recommendation-section\"><div style=\"margin-bottom: 10px;\" class=\"rha-section-header\"><h4 style=\"display: inline; padding-right: 10px;\" translate=\"\">Recommendations</h4><span style=\"display: inline-block; height: 11px; width: 11px;\" ng-show=\"RecommendationsService.loadingRecommendations\" class=\"rha-search-spinner-sm\"></span></div><span ng-show=\"loading\" class=\"rha-search-spinner\"></span><div ng-hide=\"loading\" class=\"container-fluid rha-side-padding\"><div class=\"row\"><div ng-repeat=\"recommendation in recommendationsOnScreen\"><div class=\"col-xs-3\"><div style=\"position: absolute; left: 0px;\"><span ng-class=\"{pinned: recommendation.pinned &amp;&amp; !recommendation.pinning, &quot;not-pinned&quot;: !recommendation.pinned &amp;&amp; !recommendation.pinning, &quot;rha-search-spinner-sm&quot;: recommendation.pinning}\" ng-click=\"pinRecommendation(recommendation, $index, $event)\" style=\"cursor: pointer;\">&nbsp;</span></div><div><div style=\"overflow: hidden;\" class=\"rha-bold\">{{recommendation.title}}</div><span ng-show=\"recommendation.handPicked\" ng-class=\"{&quot;hand-picked&quot;: recommendation.handPicked}\" translate=\"\">handpicked</span><div style=\"padding: 8px 0;word-wrap:break-word;\">{{recommendation.resolution.text | recommendationsResolution}}</div><a ng-click=\"triggerAnalytics($event)\" href=\"{{recommendation.view_uri}}\" target=\"_blank\">{{'View full article in new window'|translate}}</a></div></div></div></div><div style=\"padding-top: 10px;\" ng-hide=\"recommendationsOnScreen.length == 0\" class=\"row\"><div class=\"col-xs-12\"><pagination boundary-links=\"true\" total-items=\"RecommendationsService.recommendations.length\" on-select-page=\"selectRecommendationsPage(page)\" items-per-page=\"recommendationsPerPage\" page=\"currentRecommendationPage\" max-size=\"maxRecommendationsSize\" previous-text=\"&lt;\" next-text=\"&gt;\" first-text=\"&lt;&lt;\" last-text=\"&gt;&gt;\" class=\"pagination-sm\"></pagination></div></div></div></div>");
}]);

angular.module("cases/views/requestManagementEscalationModal.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/requestManagementEscalationModal.html",
    "<div class=\"modal-header\"><h3 translate=\"\">Request Management Escalation</h3></div><div style=\"padding: 20px;\" class=\"container-fluid\"><div class=\"row\"><div class=\"col-sm-12\"><span>{{'If you feel the issue has become more severe or the case should be a higher priority, please provide a detailed comment, and the case will be reviewed by a support manager.'|translate}}</span><a href=\"https://access.redhat.com/site/support/policy/mgt_escalation\">{{'Learn more'|translate}}</a></div></div><div style=\"padding-top: 10px;\" class=\"row\"><div class=\"col-sm-12\"><div>{{'Comment:'|translate}}</div><textarea style=\"width: 100%; max-width: 100%; height: 200px;\" ng-model=\"commentText\" ng-disabled=\"submittingRequest\"></textarea></div></div><div style=\"border-top: 1px; solid #cccccc; padding-top: 10px;\" class=\"row\"><div class=\"col-sm-12\"><div class=\"pull-right\"><button style=\"margin-left: 10px;\" ng-click=\"submitRequestClick(commentText)\" ng-disabled=\"submittingRequest\" class=\"btn-secondary btn\"><span>{{'Submit Request'|translate}}</span></button></div><button ng-click=\"closeModal()\" ng-disabled=\"submittingRequest\" class=\"btn-secondary btn pull-right\">Cancel</button><span ng-show=\"submittingRequest\" class=\"rha-search-spinner\"></span></div></div></div>");
}]);

angular.module("cases/views/search.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/search.html",
    "<div id=\"rha-case-search\" class=\"container-offset\"><div rha-header=\"\" page=\"searchCase\"></div><div class=\"container-fluid\"><div style=\"padding-bottom: 10px;\" class=\"row\"><div class=\"col-xs-6\"><div rha-searchbox=\"\" placeholder=\"Search\"></div></div><div class=\"col-xs-3\"><button ng-disabled=\"!securityService.loginStatus.isLoggedIn\" ui-sref=\"new\" translate=\"\" class=\"btn btn-secondary pull-right\">Open a New Support Case</button></div></div><div class=\"rha-bottom-border\"></div><div style=\"padding-bottom: 10px;\" class=\"row\"><div class=\"col-sm-2\"><label translate=\"\">Status</label><div rha-statusselect=\"\"></div></div><div class=\"col-sm-2\"><label translate=\"\">Severity</label><div rha-severityselect=\"\"></div></div><div class=\"col-sm-2\"><label translate=\"\">Type</label><div rha-typeselect=\"\"></div></div><div class=\"col-sm-2\"><label translate=\"\">Group</label><div rha-groupselect=\"\" show-search-options=\"true\"></div></div><div class=\"col-sm-2\"><label translate=\"\">Owner</label><div rha-ownerselect=\"\"></div></div><div class=\"col-sm-2\"><label translate=\"\">Product</label><div rha-productselect=\"\"></div></div></div><div ng-show=\"SearchCaseService.searching &amp;&amp; securityService.loginStatus.isLoggedIn\"><div style=\"padding-bottom: 4px;\" class=\"row\"><div class=\"col-xs-12\"><span class=\"rha-search-spinner\"></span><h3 style=\"display: inline-block; padding-left: 4px;\" translate=\"\">Searching...</h3></div></div></div><div ng-show=\"SearchCaseService.cases.length === 0 &amp;&amp; !SearchCaseService.searching &amp;&amp; securityService.loginStatus.isLoggedIn\"><div class=\"row\"><div class=\"col-xs-12\"><div>{{'No cases found with given search criteria.'|translate}}</div></div></div></div><div ng-repeat=\"case in casesOnScreen\"><div class=\"row\"><div class=\"col-xs-12\"><div rha-casesearchresult=\"\" case=\"case\"></div></div></div></div><div ng-hide=\"SearchCaseService.cases.length === 0\" style=\"border-top: 1px solid #cccccc\"><div class=\"row\"><div class=\"col-xs-6 pull-right\"><pagination style=\"float: right; cursor: pointer;\" boundary-links=\"false\" total-items=\"SearchCaseService.cases.length\" on-select-page=\"selectPage(page)\" items-per-page=\"itemsPerPage\" page=\"currentPage\" max-size=\"maxPagerSize\" rotate=\"true\" class=\"pagination-sm\"></pagination></div><div style=\"padding-top: 20px;\" class=\"col-xs-6 pull-left\"><div rha-exportcsvbutton=\"\"></div></div></div></div></div></div>");
}]);

angular.module("cases/views/searchBox.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/searchBox.html",
    "<div class=\"input-group\"><input ng-disabled=\"!securityService.loginStatus.isLoggedIn\" placeholder=\"{{placeholder}}\" ng-model=\"SearchBoxService.searchTerm\" ng-keypress=\"onFilterKeyPress($event)\" ng-change=\"SearchBoxService.onChange()\" class=\"form-control\"/><span class=\"input-group-btn\"><button ng-click=\"SearchBoxService.doSearch()\" ng-disabled=\"!securityService.loginStatus.isLoggedIn\" class=\"btn btn-default btn-primary\"><i class=\"glyphicon glyphicon-search\"></i> Search</button></span></div>");
}]);

angular.module("cases/views/searchResult.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/searchResult.html",
    "<div id=\"rha-case-search-result\"><div ng-class=\"{hascomment: theCase.comments.comment !== undefined}\" style=\"padding-top: 10px; border-top: 1px solid #cccccc; display: table; width: 100%;\" class=\"hover\"><span style=\"display: table-cell; vertical-align: top; width: 20px;\" class=\"glyphicon glyphicon-briefcase\"></span><div style=\"display: table-cell; padding-right: 20px;\"><div class=\"container-fluid\"><div style=\"padding-bottom: 6px;\" class=\"row\"><div class=\"col-xs-12\"><div style=\"display: inline-block; font-weight: bold;\"><a ng-href=\"#/case/{{theCase.case_number}}\">{{theCase.case_number}} - {{theCase.summary}}</a></div></div></div><div style=\"padding-bottom: 10px;\" class=\"row\"><div class=\"col-xs-4\"><span style=\"padding-right: 4px;\" class=\"detail-name\">{{'Updated:'|translate}}</span><span class=\"detail-value\">{{theCase.last_modified_date | date: 'medium'}}</span></div><div class=\"col-xs-4\"><span style=\"padding-right: 4px;\" class=\"detail-name\">{{'Status:'|translate}}</span><span ng-class=\"{closed: theCase.status === &quot;Closed&quot;, redhat: theCase.status === &quot;Waiting on Red Hat&quot;, customer: theCase.status === &quot;Waiting on Customer&quot;}\" class=\"detail-value status\">{{theCase.status}}</span></div><div class=\"col-xs-4\"><span style=\"padding-right: 4px;\" class=\"detail-name\">{{'Severity:'|translate}}</span><span class=\"detail-value\">{{theCase.severity}}</span></div></div><div ng-show=\"theCase.comments.comment !== undefined\" class=\"row\"><div class=\"col-xs-12\"><div class=\"well\">{{theCase.comments.comment[0].text}}</div><span class=\"comment-tip\"></span><div class=\"comment-user\"><span class=\"avatar\"></span><div class=\"commenter\">{{theCase.comments.comment[0].created_by}}</div><div class=\"comment-date\">{{theCase.comments.comment[0].created_date | date: 'medium'}}</div></div></div></div></div></div></div></div>");
}]);

angular.module("cases/views/selectLoadingIndicator.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/selectLoadingIndicator.html",
    "<div id=\"rha-select-loading-indicator\"><progressbar ng-show=\"loading\" max=\"1\" value=\"1\" animate=\"false\" ng-class=\"{select2: type === &quot;select2&quot;, bootstrap: type === &quot;bootstrap&quot;}\" style=\"margin-bottom: 0px;\" class=\"progress-striped active\"></progressbar><div ng-transclude=\"ng-transclude\" ng-hide=\"loading\"></div></div>");
}]);

angular.module("cases/views/severitySelect.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/severitySelect.html",
    "<div rha-selectloadingindicator=\"\" loading=\"severitiesLoading\" type=\"select2\"><select ui-select2=\"ui-select2\" ng-disabled=\"!securityService.loginStatus.isLoggedIn\" ng-model=\"CaseService.severity\" ng-change=\"CaseService.onSelectChanged()\" style=\"width: 100%\"><option ng-repeat=\"severity in CaseService.severities\">{{severity.name}}</option></select></div>");
}]);

angular.module("cases/views/statusSelect.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/statusSelect.html",
    "<div style=\"display: block\"><select ui-select2=\"ui-select2\" ng-disabled=\"!securityService.loginStatus.isLoggedIn\" ng-model=\"CaseService.status\" ng-change=\"CaseService.onSelectChanged()\" style=\"width: 100%\"><option ng-repeat=\"status in statuses\" value=\"{{status.value}}\">{{status.name}}</option></select></div>");
}]);

angular.module("cases/views/typeSelect.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/typeSelect.html",
    "<div rha-selectloadingindicator=\"\" loading=\"typesLoading\" type=\"select2\"><select ui-select2=\"ui-select2\" ng-disabled=\"!securityService.loginStatus.isLoggedIn\" ng-model=\"CaseService.type\" ng-change=\"CaseService.onSelectChanged()\" style=\"width: 100%\"><option ng-repeat=\"type in CaseService.types\">{{type.name}}</option></select></div>");
}]);

angular.module("log_viewer/views/logTabs.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("log_viewer/views/logTabs.html",
    "<div tabset ng-show='tabs.length > 0'>\n" +
    "    <div tab active=\"tab.active\" ng-repeat=\"tab in tabs\">\n" +
    "        <div tab-heading>{{tab.shortTitle}}\n" +
    "            <a ng-click=\"removeTab($index)\" href=''>\n" +
    "                <span class=\"glyphicon glyphicon-remove\"></span>\n" +
    "            </a>\n" +
    "        </div>\n" +
    "        <div class=\"panel panel-default\">\n" +
    "            <div class=\"panel-heading\">\n" +
    "                <a popover=\"Click to refresh log file.\" popover-trigger=\"mouseenter\" popover-placement=\"right\" ng-click=\"refreshTab($index)\">\n" +
    "                    <span class=\"glyphicon glyphicon-refresh\"></span>\n" +
    "                </a>\n" +
    "                <h3 class=\"panel-title\" style=\"display: inline\">{{tab.longTitle}}</h3>\n" +
    "                <div class=\"pull-right\" id=\"overlay\" popover=\"Select text and click to perform Red Hat Diagnose\" popover-trigger=\"mouseenter\" popover-placement=\"left\">\n" +
    "                    <button ng-disabled=\"isDisabled\" id=\"diagnoseButton\" type=\"button\" class=\"btn btn-sm btn-primary diagnoseButton\" ng-click=\"diagnoseText()\" translate='' >Red Hat Diagnose</button>\n" +
    "                </div>\n" +
    "                <a class=\"tabs-spinner\" ng-class=\"{ showMe: isLoading }\">\n" +
    "                    <span class=\"rha-search-spinner\"></span>\n" +
    "                </a>\n" +
    "\n" +
    "                <br>\n" +
    "                <br>\n" +
    "            </div>\n" +
    "            <div class=\"panel-body\" rha-filldown ng-style=\"{ height: windowHeight }\">\n" +
    "\n" +
    "                <pre id=\"resizeable-file-view\" class=\"no-line-wrap\">{{tab.content}}</pre>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>");
}]);

angular.module("log_viewer/views/log_viewer.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("log_viewer/views/log_viewer.html",
    "<div id=\"log_view_main\" style=\"max-height: 500px;\">\n" +
    "    <div class=\"container-offset\">\n" +
    "        <div rha-header page=\"logViewer\"></div>\n" +
    "    </div>\n" +
    "    <div class=\"row-fluid\" ng-controller=\"logViewerController\" ng-mouseup=\"enableDiagnoseButton()\">\n" +
    "        <div rha-navsidebar></div>\n" +
    "        <div class=col-fluid>\n" +
    "            <div rha-recommendations></div>\n" +
    "            <div class=\"col-fluid\">\n" +
    "                <div ng-controller=\"TabsDemoCtrl\" ng-class=\"{ showMe: solutionsToggle }\">\n" +
    "                    <div rha-logsinstructionpane></div>\n" +
    "                    <div rha-logtabs></div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>");
}]);

angular.module("log_viewer/views/logsInstructionPane.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("log_viewer/views/logsInstructionPane.html",
    "<div class=\"panel panel-default rha-logsinstructionpane\" ng-hide=\"tabs.length > 0\" rha-filldown ng-style=\"{ height: windowHeight }\" style=\"overflow:auto\">\n" +
    "                        <div class=\"panel-body\" >\n" +
    "                            <div>\n" +
    "                                <h2 translate=''>Log File Viewer</h2>\n" +
    "                                <p>\n" +
    "                                    <h3 translate=''>The log file viewer gives the ability to diagnose application logs as well as file a support case with Red Hat Global Support Services.\n" +
    "                                    </h3>\n" +
    "                            </div>\n" +
    "                            <div>\n" +
    "                                <br>\n" +
    "                                <h4 translate>\n" +
    "                                    <span class=\"glyphicon glyphicon-refresh\"></span>&nbsp;Select Log</h4>\n" +
    "                                <p translate>\n" +
    "                                    Simply navigate to and select a log file from the list on the left and click the 'Select File' button. </p>\n" +
    "\n" +
    "                            </div>\n" +
    "                            <div>\n" +
    "                                <br>\n" +
    "                                <h4>\n" +
    "                                    <span class=\"glyphicon glyphicon-search\"></span>&nbsp;{{'Diagnose'|translate}}\n" +
    "                                </h4>\n" +
    "                                <p translate>Once you have selected your log file then you may diagnose any part of the log file and clicking the 'Red Hat Diagnose' button. This will then display relevant articles and solutons from our Red Hat Knowledge base.</p>\n" +
    "\n" +
    "                            </div>\n" +
    "                            <div>\n" +
    "                                <br>\n" +
    "                                <h4 translate>\n" +
    "                                    <span class=\"glyphicon glyphicon-plus\"></span>&nbsp;Open a New Support Case\n" +
    "                                </h4>\n" +
    "                                <p translate>In the event that you would still like to open a support case, select 'Open a New Support Case'. The case will be pre-populated with the portion of the log previously selected.</p>\n" +
    "\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "\n" +
    "                    </div>");
}]);

angular.module("log_viewer/views/navSideBar.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("log_viewer/views/navSideBar.html",
    "<div class=\"rha-navsidebar col-xs-3\" ng-class=\"{ showMe: sidePaneToggle }\" rha-filldown ng-style=\"{height: windowHeight }\">\n" +
    "    <div class=\"hideable-side-bar\" ng-class=\"{ showMe: sidePaneToggle }\">\n" +
    "        <div ng-controller=\"DropdownCtrl\" ng-init=\"init()\">\n" +
    "            <h4 class=\"file-list-title\" ng-class=\"{ showMe: hideDropdown}\" translate=''>Available Log Files</h4>\n" +
    "            <div class=\"btn-group\" ng-class=\"{ hideMe: hideDropdown}\">\n" +
    "                <div class=\"machines-spinner\" ng-class=\"{ showMe: loading }\">\n" +
    "                    <span class=\"rha-search-spinner pull-right\"></span>\n" +
    "                </div>\n" +
    "\n" +
    "                <button type=\"button\" class=\"dropdown-toggle btn btn-sm btn-primary\" data-toggle=\"dropdown\">\n" +
    "                    {{machinesDropdownText}}\n" +
    "                    <span class=\"caret\"></span>\n" +
    "                </button>\n" +
    "                <ul class=\"dropdown-menu\">\n" +
    "                    <li ng-repeat=\"choice in items\" ng-click=\"machineSelected()\"><a>{{choice}}</a>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "            </div>\n" +
    "            <div id=\"fileList\" rha-filldown ng-style=\"{ height: windowHeight }\" class=\"fileList\" ng-controller=\"fileController\">\n" +
    "                <div data-angular-treeview=\"true\" data-tree-id=\"mytree\" data-tree-model=\"roleList\" data-node-id=\"roleId\" data-node-label=\"roleName\" data-node-children=\"children\">\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <button ng-disabled=\"retrieveFileButtonIsDisabled.check\" type=\"button\" class=\"pull-right btn btn-sm btn-primary\" ng-controller=\"selectFileButton\" ng-click=\"fileSelected()\" translate=''>\n" +
    "                Select File</button>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <a ng-click=\"sidePaneToggle = !sidePaneToggle\">\n" +
    "        <span ng-class=\"{ showMe: sidePaneToggle }\" class=\"pull-right glyphicon glyphicon-chevron-left left-side-glyphicon\"></span>\n" +
    "    </a>\n" +
    "</div>");
}]);

angular.module("log_viewer/views/recommendations.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("log_viewer/views/recommendations.html",
    "<div class=\"col-xs-6 pull-right solutions\" rha-filldown ng-style=\"{height: windowHeight }\" ng-class=\"{ showMe: solutionsToggle }\">\n" +
    "    <div id=\"resizeable-solution-view\" rha-filldown class=\"resizeable-solution-view\" ng-class=\"{ showMe: solutionsToggle }\" ng-style=\"{height: windowHeight }\" rha-accordionsearchresults='' opencase='true' ng-controller='SearchController'>\n" +
    "    </div>\n" +
    "    <a ng-click=\"solutionsToggle = !solutionsToggle\">\n" +
    "        <span ng-class=\"{ showMe: solutionsToggle }\" class=\"glyphicon glyphicon-chevron-left right-side-glyphicon\"></span>\n" +
    "    </a>\n" +
    "</div>");
}]);
