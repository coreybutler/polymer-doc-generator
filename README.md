polymer-doc-generator
=====================

Generate JSON representations of custom Polymer-based web components. Also provides an example static HTML doc builder utility.

**This is an experimental documentation generator**

Google Polymer provides a documentation tool, but I wanted more control over the look and feel of my documentation portal. This tool
generates JSON files for each web component. At the moment, it is fairly opinionated. It is pretty introspective, but does not cover
the complete Polymer spec. However; it is pretty easy to customize.

If you can decipher the code (which is decently organized), I'm open to pull requests with new features. However; I ask that you first post
an issue with the goal of the feature. If you just spring a PR on me, I may not accept it.

### Installation & Usage

This is a node module. Eventually I'll publish it, but for now, clone the repository.

Edit the `config.json` to add your own source directories and output location.

`node index.js` will create the JSON files in the output directory specified in `config.json`

`node build.js` is a demo of how static HTML can be generated from the JSON files.
