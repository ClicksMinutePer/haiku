;
export class HaikuPaginator {
    /**
     * @param maxFields The maximum amount of fields per page (default: 25)
     * @param maxDescriptionLength The maximum amount of description characters per page (default: 4096)
     * @param splitOnSpaces Attempt to split the description on spaces (default: true)
     * @description Creates a new paginator, can force page split with \f
     */
    constructor(embed, options) {
        this.page = -1;
        this.maxFields = 25;
        this.maxDescriptionLength = 4096;
        this.splitOnSpaces = true;
        this.fields = [];
        this.description = "";
        this._descriptionStartEndMemo = {};
        this.maxFields = options?.maxFields ?? 25;
        this.maxDescriptionLength = options?.maxDescriptionLength ?? 4096;
        this.splitOnSpaces = options?.splitOnSpaces ?? true;
        this.embed = embed;
    }
    *getIterator() {
        this.page = -1;
        while (true) {
            let page = this.next();
            if (!page)
                return page;
            yield page;
        }
    }
    addDescriptionContent(content, splitAfter = false) {
        this.description += content;
    }
    setDescription(description) {
        this.description = description;
        this._descriptionStartEndMemo = {};
    }
    addField(name, value) {
        this.fields.push({ name, value, inline: false });
    }
    addFields(fields) {
        this.fields = this.fields.concat(fields);
    }
    /**
     * @param page The page to get
     * @description Gets the start and end index of the page
     * @returns An array with the start and end index of the page and a bo
     */
    getPageDescriptionStartEnd(page) {
        if (!this.splitOnSpaces)
            return [page * this.maxDescriptionLength, (page + 1) * this.maxDescriptionLength, false];
        // if (this._descriptionStartEndMemo[page] && this._descriptionStartEndMemo[page + 1]) return this._descriptionStartEndMemo[page];
        let start = page === 0 ? 0 : this.getPageDescriptionStartEnd(page - 1)[1];
        console.log(start);
        let length;
        let endOnSpace = false;
        if (!this.description.substring(start, this.maxDescriptionLength).endsWith(" ") || this.description.length <= start + this.maxDescriptionLength + 1) {
            length = this.description.substring(start, this.maxDescriptionLength).lastIndexOf(' ') + 1;
            if (length === 0)
                length = this.maxDescriptionLength;
            else
                endOnSpace = true;
        }
        else {
            length = this.maxDescriptionLength;
            endOnSpace = true;
        }
        let returnValue = [start - 1, start + length + 1, endOnSpace];
        this._descriptionStartEndMemo[page] = returnValue;
        return returnValue;
    }
    getFields(page) {
        if (page * this.maxFields > this.fields.length)
            return [];
        let end = Math.min((page + 1) * this.maxFields, this.fields.length);
        return this.fields.slice(page * this.maxFields, end);
    }
    getEmbed(page) {
        this.page = page;
        let fields = this.getFields(page);
        let description = this.getPageDescriptionStartEnd(page);
        this.embed.fields = fields;
        this.embed.description = this.description.substring(description[0], description[1] - (description[2] ? 1 : 0));
        if (this.embed.fields.length === 0 && this.embed.description === "")
            return null;
        return this.embed;
    }
    next() {
        this.page++;
        let page = this.getEmbed(this.page);
        return page;
    }
    prev() {
        this.page--;
        if (this.page < 0)
            return null;
        return this.getEmbed(this.page);
    }
}
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators#iterables
/*
    Embed descriptions are limited to 4096 characters
    There can be up to 25 fields
    The sum of all characters from all embed structures in a message must not exceed 6000 characters

    maxFields must not exceed 25
    maxDescriptionLength must not exceed 4096

    https://discordjs.guide/popular-topics/embeds.html#embed-limits
*/ 
