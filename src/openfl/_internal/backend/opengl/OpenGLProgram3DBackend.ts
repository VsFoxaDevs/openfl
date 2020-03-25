namespace openfl._internal.backend.opengl;

#if openfl_gl
import openfl._internal.bindings.gl.GLProgram;
import openfl._internal.bindings.gl.GLShader;
import openfl._internal.bindings.gl.GLUniformLocation;
import openfl._internal.bindings.gl.GL;
import openfl._internal.bindings.gl.WebGLRenderingContext;
import openfl._internal.bindings.typedarray.Float32Array;
import openfl._internal.formats.agal.AGALConverter;
import openfl._internal.renderer.SamplerState;
import openfl._internal.utils.Log;
import Context3D from "openfl/display3D/Context3D";
import openfl.display3D.Program3D;
import openfl.display.ShaderParameterType;
import IllegalOperationError from "openfl/errors/IllegalOperationError";
import ByteArray from "openfl/utils/ByteArray";
import Vector from "openfl/Vector";
#if lime
import lime.graphics.OpenGLES2RenderContext;
import lime.utils.BytePointer;
#elseif openfl_html5
import openfl._internal.backend.lime_standalone.BytePointer;
#end

#if!openfl_debug
@: fileXml('tags="haxe,release"')
@: noDebug
#end
@: access(openfl._internal.backend.opengl)
@: access(openfl.display3D.Context3D)
@: access(openfl.display3D.Program3D)
@: access(openfl.display.ShaderInput)
@: access(openfl.display.ShaderParameter)
@: access(openfl.display.Stage)
class OpenGLProgram3DBackend
{
	private agalAlphaSamplerEnabled: Array<Uniform>;
	private agalAlphaSamplerUniforms: List<Uniform>;
	private agalFragmentUniformMap: UniformMap;
	private agalPositionScale: Uniform;
	private agalSamplerUniforms: List<Uniform>;
	private agalSamplerUsageMask: number;
	private agalUniforms: List<Uniform>;
	private agalVertexUniformMap: UniformMap;
	private gl: WebGLRenderingContext;
	private glFragmentShader: GLShader;
	private glFragmentSource: string;
	private glProgram: GLProgram;
	private glslAttribNames: Array<string>;
	private glslAttribTypes: Array<ShaderParameterType>;
	private glslSamplerNames: Array<string>;
	private glslUniformLocations: Array<GLUniformLocation>;
	private glslUniformNames: Array<string>;
	private glslUniformTypes: Array<ShaderParameterType>;
	private glVertexShader: GLShader;
	private glVertexSource: string;
	// private memUsage:Int;
	private parent: Program3D;

	public new(parent: Program3D)
	{
		this.parent = parent;

		gl = parent.__context.__backend.gl;

		switch (parent.__format)
		{
			case AGAL:
				// memUsage = 0;
				agalSamplerUsageMask = 0;
				agalUniforms = new List<Uniform>();
				agalSamplerUniforms = new List<Uniform>();
				agalAlphaSamplerUniforms = new List<Uniform>();
				agalAlphaSamplerEnabled = new Array<Uniform>();

			case GLSL:
				glslAttribNames = new Array();
				glslAttribTypes = new Array();
				glslSamplerNames = new Array();
				glslUniformLocations = new Array();
				glslUniformNames = new Array();
				glslUniformTypes = new Array();

			default:
		}
	}

	public dispose(): void
	{
		deleteShaders();
	}

	public getGLSLAttributeIndex(name: string): number
	{
		for (i in 0...glslAttribNames.length)
		{
			if (glslAttribNames[i] == name) return i;
		}

		return -1;
	}

	public getGLSLConstantIndex(name: string): number
	{
		for (i in 0...glslUniformNames.length)
		{
			if (glslUniformNames[i] == name) return cast glslUniformLocations[i];
		}

		return -1;
	}

	public upload(vertexProgram: ByteArray, fragmentProgram: ByteArray): void
	{
		if (parent.__format != AGAL) return;

		// samplerStates = new Vector<SamplerState> (Context3D.MAX_SAMPLERS);
		var samplerStates = new Array<SamplerState>();

		var glslVertex = AGALConverter.convertToGLSL(parent, vertexProgram, null);
		var glslFragment = AGALConverter.convertToGLSL(parent, fragmentProgram, samplerStates);

		if (Log.level == LogLevel.VERBOSE)
		{
			Log.info(glslVertex);
			Log.info(glslFragment);
		}

		deleteShaders();
		uploadFromGLSL(glslVertex, glslFragment);
		buildAGALUniformList();

		for (i in 0...samplerStates.length)
		{
			parent.__samplerStates[i] = samplerStates[i];
		}
	}

	public uploadSources(vertexSource: string, fragmentSource: string): void
	{
		if (parent.__format != GLSL) return;

		// TODO: Precision hint?

		var prefix = "#ifdef GL_ES
			#ifdef GL_FRAGMENT_PRECISION_HIGH
		precision highp float;
			#else
		precision mediump float;
			#endif
			#endif
		";

		var vertex = prefix + vertexSource;
		var fragment = prefix + fragmentSource;

		if (vertex == glVertexSource && fragment == glFragmentSource) return;

		processGLSLData(vertexSource, "attribute");
		processGLSLData(vertexSource, "uniform");
		processGLSLData(fragmentSource, "uniform");

		deleteShaders();
		uploadFromGLSL(vertex, fragment);

		// Sort by index

		var samplerNames = glslSamplerNames;
		var attribNames = glslAttribNames;
		var attribTypes = glslAttribTypes;
		var uniformNames = glslUniformNames;

		glslSamplerNames = new Array();
		glslAttribNames = new Array();
		glslAttribTypes = new Array();
		glslUniformLocations = new Array();

		var index: number, location;

		for (name in samplerNames)
		{
			index = cast gl.getUniformLocation(glProgram, name);
			glslSamplerNames[index] = name;
		}

		for (i in 0...attribNames.length)
		{
			index = gl.getAttribLocation(glProgram, attribNames[i]);
			glslAttribNames[index] = attribNames[i];
			glslAttribTypes[index] = attribTypes[i];
		}

		for (i in 0...uniformNames.length)
		{
			location = gl.getUniformLocation(glProgram, uniformNames[i]);
			glslUniformLocations[i] = location;
		}
	}

	private buildAGALUniformList(): void
	{
		if (parent.__format == GLSL) return;

		agalUniforms.clear();
		agalSamplerUniforms.clear();
		agalAlphaSamplerUniforms.clear();
		agalAlphaSamplerEnabled = [];

		agalSamplerUsageMask = 0;

		var numActive = 0;
		numActive = gl.getProgramParameter(glProgram, GL.ACTIVE_UNIFORMS);

		var vertexUniforms = new List<Uniform>();
		var fragmentUniforms = new List<Uniform>();

		for (i in 0...numActive)
		{
			var info = gl.getActiveUniform(glProgram, i);
			var name = info.name;
			var size = info.size;
			var uniformType = info.type;

			var uniform = new Uniform(parent.__context);
			uniform.name = name;
			uniform.size = size;
			uniform.type = uniformType;

			uniform.location = gl.getUniformLocation(glProgram, uniform.name);

			var indexBracket = uniform.name.indexOf("[");

			if (indexBracket >= 0)
			{
				uniform.name = uniform.name.substring(0, indexBracket);
			}

			switch (uniform.type)
			{
				case GL.FLOAT_MAT2:
					uniform.regCount = 2;
				case GL.FLOAT_MAT3:
					uniform.regCount = 3;
				case GL.FLOAT_MAT4:
					uniform.regCount = 4;
				default:
					uniform.regCount = 1;
			}

			uniform.regCount *= uniform.size;

			agalUniforms.add(uniform);

			if (uniform.name == "vcPositionScale")
			{
				agalPositionScale = uniform;
			}
			else if (StringTools.startsWith(uniform.name, "vc"))
			{
				uniform.regIndex = Std.parseInt(uniform.name.substring(2));
				uniform.regData = parent.__context.__vertexConstants;
				vertexUniforms.add(uniform);
			}
			else if (StringTools.startsWith(uniform.name, "fc"))
			{
				uniform.regIndex = Std.parseInt(uniform.name.substring(2));
				uniform.regData = parent.__context.__fragmentConstants;
				fragmentUniforms.add(uniform);
			}
			else if (StringTools.startsWith(uniform.name, "sampler") && uniform.name.indexOf("alpha") == -1)
			{
				uniform.regIndex = Std.parseInt(uniform.name.substring(7));
				agalSamplerUniforms.add(uniform);

				for (reg in 0...uniform.regCount)
				{
					agalSamplerUsageMask |= (1 << (uniform.regIndex + reg));
				}
			}
			else if (StringTools.startsWith(uniform.name, "sampler") && StringTools.endsWith(uniform.name, "_alpha"))
			{
				var len = uniform.name.indexOf("_") - 7;
				uniform.regIndex = Std.parseInt(uniform.name.substring(7, 7 + len)) + 4;
				agalAlphaSamplerUniforms.add(uniform);
			}
			else if (StringTools.startsWith(uniform.name, "sampler") && StringTools.endsWith(uniform.name, "_alphaEnabled"))
			{
				uniform.regIndex = Std.parseInt(uniform.name.substring(7));
				agalAlphaSamplerEnabled[uniform.regIndex] = uniform;
			}

			if (Log.level == LogLevel.VERBOSE)
			{
				Log.verbose('${i} name:${uniform.name} type:${uniform.type} size:${uniform.size} location:${uniform.location}');
			}
		}

		agalVertexUniformMap = new UniformMap(Lambda.array(vertexUniforms));
		agalFragmentUniformMap = new UniformMap(Lambda.array(fragmentUniforms));
	}

	private deleteShaders(): void
	{
		if (glProgram != null)
		{
			glProgram = null;
		}

		if (glVertexShader != null)
		{
			gl.deleteShader(glVertexShader);
			glVertexShader = null;
		}

		if (glFragmentShader != null)
		{
			gl.deleteShader(glFragmentShader);
			glFragmentShader = null;
		}
	}

	private disable(): void
	{
		if (parent.__format == GLSL)
		{
			// textureCount = 0;

			// for (input in __glslInputBitmapData) {

			// 	input.__disableGL (__context, textureCount);
			// 	textureCount++;

			// }

			// for (parameter in __glslParamBool) {

			// 	parameter.__disableGL (__context);

			// }

			// for (parameter in __glslParamFloat) {

			// 	parameter.__disableGL (__context);

			// }

			// for (parameter in __glslParamInt) {

			// 	parameter.__disableGL (__context);

			// }

			// // __context.__bindGLArrayBuffer (null);

			// if (__context.__context.type == OPENGL) {

			// 	gl.disable (gl.TEXTURE_2D);

			// }
		}
	}

	private enable(): void
	{
		gl.useProgram(glProgram);

		if (parent.__format == AGAL)
		{
			agalVertexUniformMap.markAllDirty();
			agalFragmentUniformMap.markAllDirty();

			for (sampler in agalSamplerUniforms)
			{
				if (sampler.regCount == 1)
				{
					gl.uniform1i(sampler.location, sampler.regIndex);
				}
				else
				{
					throw new IllegalOperationError("!!! TODO: uniform location on webgl");
				}
			}

			for (sampler in agalAlphaSamplerUniforms)
			{
				if (sampler.regCount == 1)
				{
					gl.uniform1i(sampler.location, sampler.regIndex);
				}
				else
				{
					throw new IllegalOperationError("!!! TODO: uniform location on webgl");
				}
			}
		}
		else
		{
			// textureCount = 0;

			// for (input in __glslInputBitmapData) {

			// 	gl.uniform1i (input.index, textureCount);
			// 	textureCount++;

			// }

			// if (__context.__context.type == OPENGL && textureCount > 0) {

			// 	gl.enable (gl.TEXTURE_2D);

			// }
		}
	}

	private flush(): void
	{
		if (parent.__format == AGAL)
		{
			agalVertexUniformMap.flush();
			agalFragmentUniformMap.flush();
		}
		else
		{
			// TODO
			return;

			// textureCount = 0;

			// for (input in __glslInputBitmapData) {

			// 	input.__updateGL (__context, textureCount);
			// 	textureCount++;

			// }

			// for (parameter in __glslParamBool) {

			// 	parameter.__updateGL (__context);

			// }

			// for (parameter in __glslParamFloat) {

			// 	parameter.__updateGL (__context);

			// }

			// for (parameter in __glslParamInt) {

			// 	parameter.__updateGL (__context);

			// }
		}
	}

	public markDirty(isVertex: boolean, index: number, count: number): void
	{
		if (parent.__format != AGAL) return;

		if (isVertex)
		{
			agalVertexUniformMap.markDirty(index, count);
		}
		else
		{
			agalFragmentUniformMap.markDirty(index, count);
		}
	}

	private processGLSLData(source: string, storageType: string): void
	{
		var lastMatch = 0, position, regex, name, type;

		if (storageType == "uniform")
		{
			regex = ~/uniform ([A-Za-z0-9]+) ([A-Za-z0-9_]+)/;
		}
		else
		{
			regex = ~/attribute ([A-Za-z0-9]+) ([A-Za-z0-9_]+)/;
		}

		while (regex.matchSub(source, lastMatch))
		{
			type = regex.matched(1);
			name = regex.matched(2);

			if (StringTools.startsWith(name, "gl_"))
			{
				continue;
			}

			if (StringTools.startsWith(type, "sampler"))
			{
				glslSamplerNames.push(name);
			}
			else
			{
				var parameterType: ShaderParameterType = switch (type)
				{
					case "bool": boolean;
					case "double", "float": number;
					case "int", "uint": number;
					case "bvec2": boolean2;
					case "bvec3": boolean3;
					case "bvec4": boolean4;
					case "ivec2", "uvec2": number2;
					case "ivec3", "uvec3": number3;
					case "ivec4", "uvec4": number4;
					case "vec2", "dvec2": number2;
					case "vec3", "dvec3": number3;
					case "vec4", "dvec4": number4;
					case "mat2", "mat2x2": MATRIX2X2;
					case "mat2x3": MATRIX2X3;
					case "mat2x4": MATRIX2X4;
					case "mat3x2": MATRIX3X2;
					case "mat3", "mat3x3": MATRIX3X3;
					case "mat3x4": MATRIX3X4;
					case "mat4x2": MATRIX4X2;
					case "mat4x3": MATRIX4X3;
					case "mat4", "mat4x4": MATRIX4X4;
					default: null;
				}

				if (storageType == "uniform")
				{
					glslUniformNames.push(name);
					glslUniformTypes.push(parameterType);
				}
				else
				{
					glslAttribNames.push(name);
					glslAttribTypes.push(parameterType);
				}
			}

			position = regex.matchedPos();
			lastMatch = position.pos + position.len;
		}
	}

	private setPositionScale(positionScale: Float32Array): void
	{
		if (parent.__format == GLSL) return;

		if (agalPositionScale != null)
		{
			gl.uniform4fv(agalPositionScale.location, positionScale);
		}
	}

	private uploadFromGLSL(vertexShaderSource: string, fragmentShaderSource: string): void
	{
		glVertexSource = vertexShaderSource;
		glFragmentSource = fragmentShaderSource;

		glVertexShader = gl.createShader(GL.VERTEX_SHADER);
		gl.shaderSource(glVertexShader, vertexShaderSource);
		gl.compileShader(glVertexShader);

		if (gl.getShaderParameter(glVertexShader, GL.COMPILE_STATUS) == 0)
		{
			var message = "Error compiling vertex shader";
			message += "\n" + gl.getShaderInfoLog(glVertexShader);
			message += "\n" + vertexShaderSource;
			Log.error(message);
		}

		glFragmentShader = gl.createShader(GL.FRAGMENT_SHADER);
		gl.shaderSource(glFragmentShader, fragmentShaderSource);
		gl.compileShader(glFragmentShader);

		if (gl.getShaderParameter(glFragmentShader, GL.COMPILE_STATUS) == 0)
		{
			var message = "Error compiling fragment shader";
			message += "\n" + gl.getShaderInfoLog(glFragmentShader);
			message += "\n" + fragmentShaderSource;
			Log.error(message);
		}

		glProgram = gl.createProgram();

		if (parent.__format == AGAL)
		{
			// TODO: AGAL version specific number of attributes?
			for (i in 0...16)
			{
				// for (i in 0...Context3D.MAX_ATTRIBUTES) {

				var name = "va" + i;

				if (vertexShaderSource.indexOf(" " + name) != -1)
				{
					gl.bindAttribLocation(glProgram, i, name);
				}
			}
		}
		else
		{
			// Fix support for drivers that don't draw if attribute 0 is disabled
			for (name in glslAttribNames)
			{
				if (name.indexOf("Position") > -1 && StringTools.startsWith(name, "openfl_"))
				{
					gl.bindAttribLocation(glProgram, 0, name);
					break;
				}
			}
		}

		gl.attachShader(glProgram, glVertexShader);
		gl.attachShader(glProgram, glFragmentShader);
		gl.linkProgram(glProgram);

		if (gl.getProgramParameter(glProgram, GL.LINK_STATUS) == 0)
		{
			var message = "Unable to initialize the shader program";
			message += "\n" + gl.getProgramInfoLog(glProgram);
			Log.error(message);
		}
	}
}

#if!openfl_debug
@: fileXml('tags="haxe,release"')
@: noDebug
#end
@: access(openfl._internal.backend.opengl)
@: access(openfl.display3D.Context3D)
@SuppressWarnings("checkstyle:FieldDocComment")
class Uniform
{
	public name: string;
	public location: GLUniformLocation;
	public type: number;
	public size: number;
	public regData: Float32Array;
	public regIndex: number;
	public regCount: number;
	public isDirty: boolean;
	public context: Context3D;

	#if(lime && !openfl_html5)
	private gl: OpenGLES2RenderContext;
	private regDataPointer: BytePointer;
	#else
	private gl: WebGLRenderingContext;
	#end

public new (context: Context3D)
{
	this.context = context;
		#if(lime && !openfl_html5)
	gl = context.__backend.limeContext.gles2;
	regDataPointer = new BytePointer();
		#else
	gl = context.__backend.gl;
		#end

	isDirty = true;
}

public flush(): void
	{
		var index: number = regIndex * 4;
		switch(type)
		{
			#if openfl_html5
			case GL.FLOAT_MAT2:
		gl.uniformMatrix2fv(location, false, __getUniformRegisters(index, size * 2 * 2));
		case GL.FLOAT_MAT3:
		gl.uniformMatrix3fv(location, false, __getUniformRegisters(index, size * 3 * 3));
		case GL.FLOAT_MAT4:
		gl.uniformMatrix4fv(location, false, __getUniformRegisters(index, size * 4 * 4));
		case GL.FLOAT_VEC2:
		gl.uniform2fv(location, __getUniformRegisters(index, regCount * 2));
		case GL.FLOAT_VEC3:
		gl.uniform3fv(location, __getUniformRegisters(index, regCount * 3));
		case GL.FLOAT_VEC4:
		gl.uniform4fv(location, __getUniformRegisters(index, regCount * 4));
		default:
			gl.uniform4fv(location, __getUniformRegisters(index, regCount * 4));
		#else
			case GL.FLOAT_MAT2:
		gl.uniformMatrix2fv(location, size, false, __getUniformRegisters(index, size * 2 * 2));
		case GL.FLOAT_MAT3:
		gl.uniformMatrix3fv(location, size, false, __getUniformRegisters(index, size * 3 * 3));
		case GL.FLOAT_MAT4:
		gl.uniformMatrix4fv(location, size, false, __getUniformRegisters(index, size * 4 * 4));
		case GL.FLOAT_VEC2:
		gl.uniform2fv(location, regCount, __getUniformRegisters(index, regCount * 2));
		case GL.FLOAT_VEC3:
		gl.uniform3fv(location, regCount, __getUniformRegisters(index, regCount * 3));
		case GL.FLOAT_VEC4:
		gl.uniform4fv(location, regCount, __getUniformRegisters(index, regCount * 4));
		default:
			gl.uniform4fv(location, regCount, __getUniformRegisters(index, regCount * 4));
		#end
}
	}

	#if openfl_html5
	private inline __getUniformRegisters(index : number, size : number) : Float32Array
{
	return regData.subarray(index, index + size);
}
	#elseif lime
	private inline __getUniformRegisters(index : number, size : number): BytePointer
{
	regDataPointer.set(regData, index * 4);
	return regDataPointer;
}
	#else
	private inline __getUniformRegisters(index : number, size : number): Dynamic
{
	return regData.subarray(index, index + size);
}
	#end
}

#if!openfl_debug
@: fileXml('tags="haxe,release"')
@: noDebug
#end
@SuppressWarnings("checkstyle:FieldDocComment")
class UniformMap
{
	// TODO: it would be better to use a bitmask with a dirty bit per uniform, but not super important now
	private allDirty: boolean;
	private anyDirty: boolean;
	private registerLookup: Vector<Uniform>;
	private uniforms: Array<Uniform>;

	public new(list: Array<Uniform>)
	{
		uniforms = list;

		uniforms.sort(function (a, b): number
		{
			return Reflect.compare(a.regIndex, b.regIndex);
		});

		var total = 0;

		for (uniform in uniforms)
		{
			if (uniform.regIndex + uniform.regCount > total)
			{
				total = uniform.regIndex + uniform.regCount;
			}
		}

		registerLookup = new Vector<Uniform>(total);

		for (uniform in uniforms)
		{
			for (i in 0...uniform.regCount)
			{
				registerLookup[uniform.regIndex + i] = uniform;
			}
		}

		anyDirty = allDirty = true;
	}

	public flush(): void
	{
		if (anyDirty)
		{
			for (uniform in uniforms)
			{
				if (allDirty || uniform.isDirty)
				{
					uniform.flush();
					uniform.isDirty = false;
				}
			}

			anyDirty = allDirty = false;
		}
	}

	public markAllDirty(): void
	{
		allDirty = true;
		anyDirty = true;
	}

	public markDirty(start: number, count: number): void
	{
		if (allDirty)
		{
			return;
		}

		var end = start + count;

		if (end > registerLookup.length)
		{
			end = registerLookup.length;
		}

		var index = start;

		while (index < end)
		{
			var uniform = registerLookup[index];

			if (uniform != null)
			{
				uniform.isDirty = true;
				anyDirty = true;

				index = uniform.regIndex + uniform.regCount;
			}
			else
			{
				index++;
			}
		}
	}
}
#end
