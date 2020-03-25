import IDataInput from "openfl/utils/IDataInput";
import IDataOutput from "openfl/utils/IDataOutput";

/**
	The IExternalizable interface provides control over serialization of a class as it is
	encoded into a data stream. The `writeExternal()` and `readExternal()` methods of the
	IExternalizable interface are implemented by a class to allow customization of the
	contents and format of the data stream (but not the classname or type) for an object
	and its supertypes. Each individual class must serialize and reconstruct the state of
	its instances. These methods must be symmetrical with the supertype to save its state.
	These methods supercede the native Action Message Format (AMF) serialization behavior.

	If a class does not implement, nor inherits from a class which implements, the
	IExternalizable interface, then an instance of the class will be serialized using the
	default mechanism of public members only. As a result, private, internal, and protected
	members of a class will not be available.

	To serialize private members, a class must use the IExternalizable interface. For
	example, the following class will not serialize any of its members because they are
	private:

	```as3
	class Example {

		private one:int;
		private two:int;
	}
	```

	However, if you implement the IExternalizable interface, you can write to, and read
	from, the data stream the private members of the class as follows:

	```as3
	class Example implement IExternalizable {

		private one:int;
		private two:int;

		public writeExternal(output:IDataOutput) {

				output.writeInt(one);
				output.writeInt(two);
		}

		public readExternal(input:IDataInput) {

				one = input.readInt();
				two = input.readInt();
		}
	}
	```

	**Note:** If a class implements IExternalizable the default serialization no longer
	applies to instances of that class. If that class inherits public members from a super
	class, you must carefully manage those members as well.

	When a subclass of a class implementing IExternalizable has private members of its own,
	the subclass mustthe methods of IExternalizable, as follows:

	```as3
	public class Base implements IExternalizable {

		private one:Boolean;

		public writeExternal(output:IDataOutput):void {

			output.writeBoolean(one);
		}

		public readExternal(input:IDataInput):void {

			one = input.readBoolean();
		}
	}

	public class Example extends Base {

		private one:String;


		publicwriteExternal(output:IDataOutput):void {

			super.writeExternal(output);
			output.writeUTF(one);
		}

		publicreadExternal(input:IDataInput):void {

			super.readExternal(input);
			one = input.readUTF();
		}
	}
	```

	The IExternalizable interface can also be used to compress data before writing it to a
	data stream. For example:

	```as3
	class Example implements IExternalizable {

		public one:Boolean;
		public two:Boolean;
		public three:Boolean;
		public four:Boolean;
		public five:Boolean;
		public six:Boolean;
		public seven:Boolean;
		public eight:Boolean;

		public writeExternal(output:IDataOutput) {

			var flag:int = 0;

			if (one) flag |= 1;
			if (two) flag |= 2;
			if (three) flag |= 4;
			if (four) flag |= 8;
			if (five) flag |= 16;
			if (six) flag |= 32;
			if (seven) flag |= 64;
			if (eight) flag |= 128;

			output.writeByte(flag);
		}

		public readExternal(input:IDataInput) {

			var flag:int = input.readByte();

			one = (flag & 1) != 0;
			two = (flag & 2) != 0;
			three = (flag & 4) != 0;
			four = (flag & 8) != 0;
			five = (flag & 16) != 0;
			six = (flag & 32) != 0;
			seven = (flag & 64) != 0;
			eight = (flag & 128) != 0;
		}
	}
	```
**/
export interface IExternalizable
{
	/**
		A class implements this method to decode itself from a data stream by calling the
		methods of the IDataInput interface. This method must read the values in the same
		sequence and with the same types as were written by the `writeExternal()` method.

		@param	input	The name of the class that implements the IDataInput interface.
	**/
	readExternal(input: IDataInput): void;

	/**
		A class implements this method to encode itself for a data stream by calling the
		methods of the IDataOutput interface.

		@param	output	The name of the class that implements the IDataOutput interface.
	**/
	writeExternal(output: IDataOutput): void;
}

export default IExternalizable;
