namespace $.$$ {
	
	export type File = {
		uri: string;
		code: string;
		points: (Fun | NativeCall | InlinedFun)[];
	};
	export type Fun = {
		type: 'Fun';
		pos: number;
		source: {uri: string; start: number; end: number};
		optimizationCount: number;
		reasons: string[];
		optimized: boolean;
		points: undefined
	};
	export type NativeCall = {
		type: 'NativeCall';
		reasons: string[];
		pos: number;
		points: undefined
	};
	export type InlinedFun = {
		type: 'InlinedFun';
		points: (Fun | NativeCall | InlinedFun)[];
		name: string;
		pos: number;
		reasons: undefined;
		source: {uri: string; start: number; end: number};
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
		
		file() {
			
			const uri = this.$.$mol_state_arg.value( 'file' )
			if( !uri ) return null
			
			return this.files().get( uri ) ?? null
		}
		
		inline_path() {
			
			const path = this.$.$mol_state_arg.value( 'inline' )
			if( !path ) return []
			
			return path.split( ',' ).map( Number )
		}
		
		@ $mol_mem_key
		point( deep: number ): InlinedFun {
			if( !deep ) {
				const file = this.file()!
				return {
					type: 'InlinedFun',
					points: file.points,
					name: file.uri,
					pos: 0,
					reasons: undefined,
					source: { uri: file.uri, start: 0, end: file.code.length },
				}
			}
			return this.point( deep - 1 ).points![ this.inline_path()[ deep - 1 ] ] as InlinedFun
		}
		
		script_title( deep: number ) {
			if( !deep ) return this.file()!.uri
			const point = this.point( deep )
			return point.name || `Inlined #${ this.inline_path()[ deep - 1 ]}`
		}
		
		script( deep: number ) {
			const source = this.script_source( deep )
			return this.files().get( source.uri )!.code
		}
		
		@ $mol_mem_key
		script_source( deep: number ) {
			return this.point( deep ).source
		}
		
		@ $mol_mem_key
		points( deep: number ) {
			return this.point( deep ).points
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
		
		points() {
			return super.points() as readonly ( Fun | NativeCall | InlinedFun )[]
		}
		
		@ $mol_mem
		filters() {
			const next = {} as Record< string, string >
			for( const point of this.points() ) {
				for( const reason of ( point.reasons ?? [] ) ) {
					next[ reason ] = reason
				}
			}
			return next
		}
		
		@ $mol_mem
		points_followers() {
			return this.points().map( ( point, index )=> {
				switch( point.type ) {
					case 'InlinedFun': return this.Inline( index )
					case 'NativeCall': return this.Native( index )
					case 'Fun': return this.Func( index )
				}
			} )
		}
		
		@ $mol_mem
		points_followers_filtered() {
			const points = this.points()
			return this.points_followers().filter( (_, index ) => {
				const point = points[ index ]
				if( !point.reasons ) return true
				if( !point.reasons.length ) return true
				return point.reasons.some( reason => this.filter_enabled( reason ) )
			} )
		}
		
		@ $mol_mem
		body() {
			return [
				this.Code(),
				... this.points_followers_filtered(),
			]
		}
		
		code() {
			const source = this.source()
			return this.script().slice( source.start, source.end )
		}
		
		@ $mol_mem_key
		point_pos( index: number ) {
			return this.Code().find_pos( this.points()[ index ].pos - this.source().start )
		}
		
		Point_anchor( index: number ) {
			return this.point_pos( index )!.token
		}
		
		@ $mol_mem_key
		point_offset( index: number ) {
			const pos = this.point_pos( index )!
			const text = pos.token.haystack()
			return [ pos.offset / text.length, .1 ]
		}
		
		@ $mol_mem_key
		inline_arg( index: number ) {
			return {
				inline: [ ... this.path(), index ].join( ',' )
			}
		}
		
		@ $mol_mem_key
		point_hint( index: number ) {
			const point = this.points()[ index ]
			return [
				... point.type === 'Fun'
					? [ `${ point.optimized ? 'Optimized' : 'Deoptimized' } after ${ point.optimizationCount } attempts` ]
					: [],
				... point.reasons!
			].join( '\n' )
		}
		
		func_attempts( index: number ) {
			return ( this.points()[ index ] as Fun ).optimizationCount
		}
		
		func_optimized( index: number ) {
			return ( this.points()[ index ] as Fun ).optimized
		}
		
		inline_current( index: number ) {
			return this.$.$mol_state_arg.value( 'inline' )?.startsWith( this.inline_arg( index ).inline ) ?? false
		}
		
		@ $mol_mem
		jump_rows() {
			
			const rows = new Set<$mol_text_code_row>()
			
			const points = this.points()
			for( let i =0; i < points.length; ++ i ) {
				const anchor = this.Point_anchor( i )
				const row = ( $mol_owning_get( anchor ) as $mol_wire_atom<any,any,any> ).host
				rows.add( row )
			}
			
			return [ ... rows ]
		}
		
		@ $mol_mem
		jump( next?: number ) {
			const rows = this.jump_rows()
			if( next === undefined ) return rows.length
			if( next > rows.length ) next = 1
			if( next < 1 ) next = rows.length
			if( next ) this.Code().ensure_visible( rows[ next - 1 ] )
			return next
		}
		
		@ $mol_mem
		tools() {
			return [
				this.Search(),
				... this.search() ? [] : [ this.Jump() ]
			]
		}
		
	}
	
}
