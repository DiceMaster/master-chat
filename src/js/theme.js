export class Theme {
    constructor (name) {
        this.name = name;
        this._templateDir = "templates/" + this.name + "/";
        this._cssPath = "/" + this._templateDir + "style.css";
    }

    getCssPath () {
        return this._cssPath;
    }
    
    getRankIconPath (rankIcon) {
        return "/" + this._templateDir + rankIcon;
    }    
}
