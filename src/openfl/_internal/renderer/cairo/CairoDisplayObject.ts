namespace openfl._internal.renderer.cairo;

#if openfl_cairo
import lime.math.ARGB;
import openfl.display.DisplayObject;

#if!openfl_debug
@: fileXml('tags="haxe,release"')
@: noDebug
#end
@: access(openfl.display.DisplayObject)
@: access(openfl.geom.Matrix)
@SuppressWarnings("checkstyle:FieldDocComment")
class CairoDisplayObject
{
	public static render(displayObject: DisplayObject, renderer: CairoRenderer): void
	{
		if (displayObject.opaqueBackground == null && displayObject.__graphics == null) return;
		if (!displayObject.__renderable) return;

		var alpha = renderer.__getAlpha(displayObject.__worldAlpha);
		if (alpha <= 0) return;

		if (displayObject.opaqueBackground != null
			&& !displayObject.__renderData.isCacheBitmapRender
			&& displayObject.width > 0
			&& displayObject.height > 0)
		{
			var cairo = renderer.cairo;

			renderer.__setBlendMode(displayObject.__worldBlendMode);
			renderer.__pushMaskObject(displayObject);

			renderer.applyMatrix(displayObject.__renderTransform, cairo);

			var color: ARGB = (displayObject.opaqueBackground : ARGB);
			cairo.setSourceRGB(color.r / 0xFF, color.g / 0xFF, color.b / 0xFF);
			cairo.rectangle(0, 0, displayObject.width, displayObject.height);
			cairo.fill();

			renderer.__popMaskObject(displayObject);
		}

		if (displayObject.__graphics != null)
		{
			CairoShape.render(displayObject, renderer);
		}
	}
}
#end
