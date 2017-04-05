/*
**  GemstoneJS -- Gemstone JavaScript Technology Stack
**  Copyright (c) 2016-2017 Gemstone Project <http://gemstonejs.com>
**  Licensed under Apache License 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  load external requirements  */
const path      = require("path")
const fs        = require("fs-promise")
const jsonLint  = require("jsonlint")

/*  exported API function  */
module.exports = async function (filenames, opts = {}, report = { sources: {}, findings: [] }) {
    /*  enable reasonable error handling inside JSONLint  */
    let ParseError = function (message, info) {
        this.name    = "ParseError"
        this.message = message
        this.info    = info
    }
    ParseError.prototype = Error
    let oldParseError = jsonLint.parser.parseError
    jsonLint.parser.parseError = (str, info) => {
        throw new ParseError(str, info)
    }

    /*  interate over all source files  */
    let passed = true
    if (typeof opts.progress === "function")
        opts.progress(0.0, "linting JSON: starting")
    for (let i = 0; i < filenames.length; i++) {
        /*  indicate progress  */
        if (typeof opts.progress === "function")
            opts.progress(i / filenames.length, `linting JSON: ${filenames[i]}`)

        /*  read source code  */
        let source = await fs.readFile(filenames[i], "utf8")

        /*  determine name  */
        let name = path.relative(process.cwd(), filenames[i])

        /*  lint the source code  */
        try {
            jsonLint.parser.parse(source)
        }
        catch (ex) {
            report.findings.push({
                ctx:      "JSON",
                filename: name,
                line:     ex.info.loc.first_line,
                column:   ex.info.loc.first_column,
                message:  `found: ${ex.info.token}, expected: ${ex.info.expected.join(", ")}`,
                ruleProc: "jsonlint",
                ruleId:   "*"
            })
            report.sources[name] = source
            passed = false
        }
    }
    if (typeof opts.progress === "function")
        opts.progress(1.0, "")

    /*  restore JSONLint error handling  */
    jsonLint.parser.parseError = oldParseError

    return passed
}

