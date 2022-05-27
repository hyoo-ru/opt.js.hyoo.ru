namespace $.$$ {
	
	type File = {
		uri: string;
		code: string;
		functions: readonly Fun[];
	};
	
	type Fun = {
		source: {start: number; end: number};
		optimized: boolean;
		name: string;
		root: boolean;
		versions: {
			deoptReason: string;
			nativeCalls: readonly NativeCall[];
			inlinedFuns: readonly InlinedFun[];
		}[];
	};
	
	type NativeCall = {
		reasons: string[];
		pos: number;
	};
	
	type InlinedFun = {
		pos: number;
		name: string;
		source: {uri: string; start: number; end: number};
		nativeCalls: readonly NativeCall[];
		inlinedFuns: readonly InlinedFun[];
	};

	export class $hyoo_js_opt extends $.$hyoo_js_opt {
		
		@ $mol_mem
		data( next = [] as File[] ) {
			return next
		}
		
		@ $mol_mem
		files() {
			
			const raw =  this.data()
			const files = new Map< string, File >()
			
			for( const file of raw ) {
				files.set( file.uri, file )
			}
			
			return files
		}
		
		@ $mol_mem
		menu_content() {
			return [ ... this.files().keys() ].map( uri => this.File( uri ) )
		}
		
		file_uri( uri: string ) {
			return uri
		}
		
		// @ $mol_mem_key
		// file_content( file: string ) {
		// 	return this.files().get( file )!.functions
		// 		.map( ( _, func )=> this.Func({ file, func }) )
		// }
		
		// func_id( { file, func }: { file: string, func: number } ) {
		// 	return 'Function ' + (
		// 		this.files().get( file )!.functions[ func ].name
		// 		|| `#${func}`
		// 	)
		// }
		
		// @ $mol_mem_key
		// func_content( { file, func }: { file: string, func: number } ) {
		// 	return this.files().get( file )!.functions[ func ].versions
		// 		.map( ( _, ver )=> this.Ver({ file, func, ver }) )
		// }
		
		// ver_id( { file, func, ver }: { file: string, func: number, ver: number } ) {
		// 	return `Version #${ver}`
		// }
		
		// ver_arg( { file, func, ver }: { file: string, func: number, ver: number } ) {
		// 	return {
		// 		file,
		// 		func: String( func ),
		// 		ver: String( ver ),
		// 		inline: null,
		// 	}
		// }
		
		file() {
			
			const uri = this.$.$mol_state_arg.value( 'file' )
			if( !uri ) return null
			
			return this.files().get( uri ) ?? null
		}
		
		func_index() {
			const index = this.$.$mol_state_arg.value( 'func' )
			return index ? Number( index ) : null
		}
		
		func() {
			
			const index = this.func_index()
			if( index === null ) return null
			
			return this.file()!.functions[ index ] ?? null
		}
		
		ver() {
			
			const index = this.$.$mol_state_arg.value( 'ver' )
			if( !index ) return null
			
			const func = this.func()
			if( !func ) return null
			
			const ver = {
				source: {
					uri: this.file()!.uri,
					... func.source,
				},
				... func.versions[ Number( index ) ]
			}
			
			return ver
		}
		
		inline_path() {
			
			const path = this.$.$mol_state_arg.value( 'inline' )
			if( !path ) return []
			
			return path.split( ',' ).map( Number )
		}
		
		@ $mol_mem_key
		inline( deep: number ): InlinedFun {
			
			if( !deep ) {
				
				const file = this.file()!
				const natives = [] as NativeCall[]
				const inlines = [] as InlinedFun[]
				
				for( const func of file.functions ) {
					const version = func.versions.at(-1)!
					natives.push( ... version.nativeCalls )
					inlines.push( ... version.inlinedFuns )
				}
				
				return {
					name: file.uri,
					inlinedFuns: inlines,
					nativeCalls: natives,
					pos: 0,
					source: { uri: file.uri, start: 0, end: file.code.length }
				}
				
			}
			
			return this.inline( deep - 1 ).inlinedFuns![ this.inline_path()[ deep - 1 ] ]
		}
		
		script_title( deep: number ) {
			if( !deep ) return this.file()!.uri
			const index = this.inline_path()[ deep - 1 ]
			return this.inline( deep ).name || `Inlined #${index}`
		}
		
		script() {
			return this.file()!.code
		}
		
		@ $mol_mem_key
		script_source( deep: number ) {
			return this.inline( deep ).source
		}
		
		@ $mol_mem_key
		natives( deep: number ) {
			return this.inline( deep ).nativeCalls ?? []
		}
		
		@ $mol_mem_key
		inlines( deep: number ) {
			return this.inline( deep ).inlinedFuns ?? []
		}
		
		script_path( deep: number ) {
			return this.inline_path().slice( 0, deep )
		}
		
		@ $mol_mem
		pages() {
			return [
				this.Menu_page(),
				... this.file() ? [
					this.Script(0),
					... this.inline_path().map( (_,i)=> this.Script(i+1) ),
				] : [],
			]
		}
		
	}
	
	export class $hyoo_js_opt_script extends $.$hyoo_js_opt_script {
		
		natives() {
			return super.natives() as readonly NativeCall[]
		}
		
		inlines() {
			return super.inlines() as readonly InlinedFun[]
		}
		
		@ $mol_mem
		body() {
			return [
				this.Code(),
				... this.natives().map( (_,i)=> this.Native(i) ),
				... this.inlines().map( (_,i)=> this.Inline(i) ),
			]
		}
		
		code() {
			const source = this.source()
			return this.script().slice( source.start, source.end )
		}
		
		@ $mol_mem_key
		native_pos( index: number ) {
			return this.Code().find_pos( this.natives()[ index ].pos - this.source().start )
		}
		
		@ $mol_mem_key
		inline_pos( index: number ) {
			return this.Code().find_pos( this.inlines()[ index ].pos - this.source().start )
		}
		
		Native_anchor( index: number ) {
			return this.native_pos( index )!.token
		}
		
		Inline_anchor( index: number ) {
			return this.inline_pos( index )!.token
		}
		
		@ $mol_mem_key
		native_offset( index: number ) {
			const pos = this.native_pos( index )!
			const text = pos.token.haystack()
			return [ pos.offset / text.length, 0 ]
		}
		
		@ $mol_mem_key
		inline_offset( index: number ) {
			const pos = this.inline_pos( index )!
			const text = pos.token.haystack()
			return [ pos.offset / text.length, 0 ]
		}
		
		@ $mol_mem_key
		inline_arg( index: number ) {
			return {
				inline: [ ... this.path(), index ].join( ',' )
			}
		}
		
		@ $mol_mem_key
		native_reason( index: number ) {
			return this.natives()[ index ].reasons.join( '\n' )
		}
		
		inline_current( index: number ) {
			return this.$.$mol_state_arg.value( 'inline' )?.startsWith( this.inline_arg( index ).inline ) ?? false
		}
		
	}
	
}
