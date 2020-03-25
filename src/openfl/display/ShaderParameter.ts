namespace openfl.display
{
	/**
		TODO: Document GLSL Shaders

		A ShaderParameter instance represents a single input parameter of a shader
		kernel. A kernel can be defined to accept zero, one, or more parameters
		that are used in the kernel execution. A ShaderParameter provides
		information about the parameter, such as the type of data it expects. It
		also provides a mechanism for setting the parameter value that is used
		when the shader executes. To specify a value or values for the shader
		parameter, create an Array containing the value or values and assign it to
		the `value` property.

		A ShaderParameter instance representing a parameter for a Shader instance
		is accessed as a property of the Shader instance's `data` property. The
		ShaderParameter property has the same name as the parameter's name in the
		shader code. For example, if a shader defines a parameter named `radius`,
		the ShaderParameter instance representing the `radius` parameter is
		available as the `radius` property, as shown here:

		```haxe
		var radiusParam:ShaderParameter = myShader.data.radius;
		```

		In addition to the defined properties of the ShaderParameter class, each
		ShaderParameter instance has additional properties corresponding to any
		metadata defined for the parameter. These properties are added to the
		ShaderParameter object when it is created. The properties' names match the
		metadata names specified in the shader's source code. The data type of
		each property varies according to the data type of the corresponding
		metadata. A text metadata value such as "description" is a String
		instance. A metadata property with a non-string value (such as `minValue`
		or `defaultValue`) is represented as an Array instance. The number of
		elements and element data types correspond to the metadata values.

		For example, suppose a shader includes the following two parameter
		declarations:

		```as3
		parameter float2 size
		<
			description: "The size of the image to which the kernel is applied";
			minValue : number2(0.0, 0.0);
			maxValue : number2(100.0, 100.0);
			defaultValue : number2(50.0, 50.0);
		>;

		parameter float radius
		<
			description: "The radius of the effect";
			minValue: 0.0;
			maxValue: 50.0;
			defaultValue: 25.0;
		>;
		```

		The ShaderParameter instance corresponding to the `size` parameter has the
		following metadata properties in addition to its built-in properties:

		| Property name | Data type | Value |
		| --- | --- | --- |
		| `name` | String | `"size"` |
		| `description` | String | `"The size of the image to which the kernel is applied"` |
		| `minValue` | Array | `[0, 0]` |
		| `maxValue` | Array | `[100, 100]` |
		| `defaultValue` | Array | `[50, 50]` |

		The ShaderParameter corresponding to the `radius` parameter has the
		following additional properties:

		| Property name | Data type | Value |
		| --- | --- | --- |
		| `name` | String | `"radius"` |
		| `description` | String | `"The radius of the effect"` |
		| `minValue` | Array | `[0]` |
		| `maxValue` | Array | `[50]` |
		| `defaultValue` | Array | `[25]` |

		Generally, developer code does not create a ShaderParameter instance
		directly. A ShaderParameter instance is created for each of a shader's
		parameters when the Shader instance is created.
	**/
	export class ShaderParameter<T> /*implements Dynamic*/
	{
		/**
			The zero-based index of the parameter.
		**/
		public index(default , null): Dynamic;

	/** @hidden */ @SuppressWarnings("checkstyle:FieldDocComment") public name(default , set): string;

		/**
			The data type of the parameter as defined in the shader. The set of
			possible values for the `type` property is defined by the constants in
			the ShaderParameterType class.
		**/
		public type(default , null): ShaderParameterType;

		/**
			The value or values that are passed in as the parameter value to the
			shader. The `value` property is an indexed Array. The number and type
			of the elements of the Array correspond to the data type of the
			parameter, which can be determined using the `type` property.
			The following table indicates the parameter type and corresponding
			number and data type of the `value` Array's elements:

			| Parameter type | # Elements | Element data type |
			| --- | --- | --- |
			| float (`ShaderParameterType.FLOAT`) | 1 | Number |
			| float2 (`ShaderParameterType.FLOAT2`) | 2 | Number |
			| float3 (`ShaderParameterType.FLOAT3`) | 3 | Number |
			| float4 (`ShaderParameterType.FLOAT4`) | 4 | Number |
			| int (`ShaderParameterType.INT`) | 1 | int or uint |
			| int2 (`ShaderParameterType.INT2`) | 2 | int or uint |
			| int3 (`ShaderParameterType.INT3`) | 3 | int or uint |
			| int4 (`ShaderParameterType.INT4`) | 4 | int or uint |
			| bool (`ShaderParameterType.BOOL`) | 1 | Boolean |
			| bool2	(`ShaderParameterType.BOOL2`) | 2 | Boolean |
			| bool3 (`ShaderParameterType.BOOL3`) | 3 | Boolean |
			| bool4 (`ShaderParameterType.BOOL4`) | 4 | Boolean |
			| float2x2 (`ShaderParameterType.MATRIX2X2`) | 4 | Number |
			| float3x3 (`ShaderParameterType.MATRIX3X3`) | 9 | Number |
			| float4x4 (`ShaderParameterType.MATRIX4X4`) | 16 | Number |

			For the matrix parameter types, the array elements fill the rows of
			the matrix, then the columns. For example, suppose the following line
			of ActionScript is used to fill a `float2x2` parameter named
			`myMatrix`:

			```haxe
			myShader.data.myMatrix.value = [.1, .2, .3, .4];
			```

			Within the shader, the matrix elements have the following values:

			* `myMatrix[0][0]`: .1
			* `myMatrix[0][1]`: .2
			* `myMatrix[1][0]`: .3
			* `myMatrix[1][1]`: .4
		**/
		public value: Array<T>;

		protected __backend: ShaderParameterBackend<T>;

		public constructor()
		{
			index = 0;

			__backend = new ShaderParameterBackend<T>(this);
		}

		// Get & Set Methods
		protected set_name(value: string): string
		{
			__backend.setName(value);
			return this.name = value;
		}
	}
}

export default openfl.display.ShaderParameter;
