// wrap a layer in a group given the layer's converter object
'use strict'

module.exports = function wrapLayer(element, attr, converter, scale, tag) {
  var layer = converter.layer

  if (scale && scale !== 1) {
    attr.transform = 'scale(' + scale + ',' + scale + ')'
  }

  return element(tag || 'g', attr, layer)
}
