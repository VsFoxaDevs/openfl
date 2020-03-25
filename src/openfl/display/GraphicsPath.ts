import GraphicsDataType from "openfl/_internal/renderer/GraphicsDataType";
import Vector from "openfl/Vector";

namespace openfl.display
{
	/**
		A collection of drawing commands and the coordinate parameters for those
		commands.

		Use a GraphicsPath object with the
		`Graphics.drawGraphicsData()` method. Drawing a GraphicsPath
		object is the equivalent of calling the `Graphics.drawPath()`
		method.

		The GraphicsPath class also has its own set of methods
		(`curveTo()`, `lineTo()`, `moveTo()`
		`wideLineTo()` and `wideMoveTo()`) similar to those
		in the Graphics class for making adjustments to the
		`GraphicsPath.commands` and `GraphicsPath.data`
		vector arrays.
	**/
	export class GraphicsPath implements IGraphicsData implements IGraphicsPath
	{
		private static readonly SIN45: number = 0.70710678118654752440084436210485;
		private static readonly TAN22: number = 0.4142135623730950488016887242097;

		/**
			The Vector of drawing commands as integers representing the path. Each
			command can be one of the values defined by the GraphicsPathCommand class.
		**/
		public commands: Vector<Int>;

		/**
			The Vector of Numbers containing the parameters used with the drawing
			commands.
		**/
		public data: Vector<Float>;

		/**
			Specifies the winding rule using a value defined in the
			GraphicsPathWinding class.
		**/
		public winding: GraphicsPathWinding;

		protected __graphicsDataType(default , null): GraphicsDataType;

		/**
			Creates a new GraphicsPath object.

			@param winding Specifies the winding rule using a value defined in the
						   GraphicsPathWinding class.
		**/
		public constructor(commands: Vector<Int> = null, data: Vector<Float> = null, winding: GraphicsPathWinding = GraphicsPathWinding.EVEN_ODD)
		{
			this.commands = commands;
			this.data = data;
			this.winding = winding;
			this.__graphicsDataType = PATH;
		}

		/**
			Adds a new "cubicCurveTo" command to the commands vector and new coordinates to
			the data vector.

			@param	controlX1	A number that specifies the horizontal position of the first
			control point relative to the registration point of the parent display object.
			@param	controlY1	A number that specifies the vertical position of the first
			control point relative to the registration point of the parent display object.
			@param	controlX2	A number that specifies the horizontal position of the second
			control point relative to the registration point of the parent display object.
			@param	controlY2	A number that specifies the vertical position of the second
			control point relative to the registration point of the parent display object.
			@param	anchorX	A number that specifies the horizontal position of the next anchor
			point relative to the registration point of the parent display object.
			@param	anchorY	A number that specifies the vertical position of the next anchor
			point relative to the registration point of the parent display object.
		**/
		public cubicCurveTo(controlX1: number, controlY1: number, controlX2: number, controlY2: number, anchorX: number, anchorY: number): void
		{
			if (commands == null) commands = new Vector();
			if (data == null) data = new Vector();

			commands.push(GraphicsPathCommand.CUBIC_CURVE_TO);
			data.push(controlX1);
			data.push(controlY1);
			data.push(controlX2);
			data.push(controlY2);
			data.push(anchorX);
			data.push(anchorY);
		}

		/**
			Adds a new "curveTo" command to the `commands` vector and new
			coordinates to the `data` vector.

			@param controlX A number that specifies the horizontal position of the
							control point relative to the registration point of the
							parent display object.
			@param controlY A number that specifies the vertical position of the
							control point relative to the registration point of the
							parent display object.
			@param anchorX  A number that specifies the horizontal position of the
							next anchor point relative to the registration point of
							the parent display object.
			@param anchorY  A number that specifies the vertical position of the next
							anchor point relative to the registration point of the
							parent display object.
		**/
		public curveTo(controlX: number, controlY: number, anchorX: number, anchorY: number): void
		{
			if (commands == null) commands = new Vector();
			if (data == null) data = new Vector();

			commands.push(GraphicsPathCommand.CURVE_TO);
			data.push(controlX);
			data.push(controlY);
			data.push(anchorX);
			data.push(anchorY);
		}

		/**
			Adds a new "lineTo" command to the `commands` vector and new
			coordinates to the `data` vector.

			@param x The x coordinate of the destination point for the line.
			@param y The y coordinate of the destination point for the line.
		**/
		public lineTo(x: number, y: number): void
		{
			if (commands == null) commands = new Vector();
			if (data == null) data = new Vector();

			commands.push(GraphicsPathCommand.LINE_TO);
			data.push(x);
			data.push(y);
		}

		/**
			Adds a new "moveTo" command to the `commands` vector and new
			coordinates to the `data` vector.

			@param x The x coordinate of the destination point.
			@param y The y coordinate of the destination point.
		**/
		public moveTo(x: number, y: number): void
		{
			if (commands == null) commands = new Vector();
			if (data == null) data = new Vector();

			commands.push(GraphicsPathCommand.MOVE_TO);
			data.push(x);
			data.push(y);
		}

		/**
			Adds a new "wideLineTo" command to the `commands` vector and
			new coordinates to the `data` vector.

			@param x The x-coordinate of the destination point for the line.
			@param y The y-coordinate of the destination point for the line.
		**/
		public wideLineTo(x: number, y: number): void
		{
			if (commands == null) commands = new Vector();
			if (data == null) data = new Vector();

			commands.push(GraphicsPathCommand.LINE_TO);
			data.push(x);
			data.push(y);
		}

		/**
			Adds a new "wideMoveTo" command to the `commands` vector and
			new coordinates to the `data` vector.

			@param x The x-coordinate of the destination point.
			@param y The y-coordinate of the destination point.
		**/
		public wideMoveTo(x: number, y: number): void
		{
			if (commands == null) commands = new Vector();
			if (data == null) data = new Vector();

			commands.push(GraphicsPathCommand.MOVE_TO);
			data.push(x);
			data.push(y);
		}

		protected __drawCircle(x: number, y: number, radius: number): void
		{
			__drawRoundRect(x - radius, y - radius, radius * 2, radius * 2, radius * 2, radius * 2);
		}

		protected __drawEllipse(x: number, y: number, width: number, height: number): void
		{
			__drawRoundRect(x, y, width, height, width, height);
		}

		protected __drawRect(x: number, y: number, width: number, height: number): void
		{
			moveTo(x, y);
			lineTo(x + width, y);
			lineTo(x + width, y + height);
			lineTo(x, y + height);
			lineTo(x, y);
		}

		protected __drawRoundRect(x: number, y: number, width: number, height: number, ellipseWidth: number, ellipseHeight: number): void
		{
			ellipseWidth *= 0.5;
			ellipseHeight *= 0.5;

			if (ellipseWidth > width / 2) ellipseWidth = width / 2;
			if (ellipseHeight > height / 2) ellipseHeight = height / 2;

			var xe = x + width,
				ye = y + height,
				cx1 = -ellipseWidth + (ellipseWidth * SIN45),
				cx2 = -ellipseWidth + (ellipseWidth * TAN22),
				cy1 = -ellipseHeight + (ellipseHeight * SIN45),
				cy2 = -ellipseHeight + (ellipseHeight * TAN22);

			moveTo(xe, ye - ellipseHeight);
			curveTo(xe, ye + cy2, xe + cx1, ye + cy1);
			curveTo(xe + cx2, ye, xe - ellipseWidth, ye);
			lineTo(x + ellipseWidth, ye);
			curveTo(x - cx2, ye, x - cx1, ye + cy1);
			curveTo(x, ye + cy2, x, ye - ellipseHeight);
			lineTo(x, y + ellipseHeight);
			curveTo(x, y - cy2, x - cx1, y - cy1);
			curveTo(x - cx2, y, x + ellipseWidth, y);
			lineTo(xe - ellipseWidth, y);
			curveTo(xe + cx2, y, xe + cx1, y - cy1);
			curveTo(xe, y - cy2, xe, y + ellipseHeight);
			lineTo(xe, ye - ellipseHeight);
		}
	}
}

export default openfl.display.GraphicsPath;
