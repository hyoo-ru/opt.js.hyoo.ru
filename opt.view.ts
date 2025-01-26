namespace $.$$ {
	
	type File = {
		uri: string;
		code: string;
		points: (Fun | NativeCall | InlinedFun)[];
	};
	type Fun = {
		type: 'Fun';
		pos: number;
		name: string;
		source: {uri: string; start: number; end: number};
		optimizationCount: number;
		asm: string;
		reasons: string[];
		optimized: boolean;
		points: undefined
	};
	type NativeCall = {
		type: 'NativeCall';
		reasons: string[];
		pos: number;
		points: undefined
	};
	type InlinedFun = {
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
		
		@ $mol_mem
		inline_path() {
			
			const path = this.$.$mol_state_arg.value( 'inline' )
			if( !path ) return []
			
			return path.split( ',' ).map( Number )
		}
		
		@ $mol_mem_key
		point( deep: number ): InlinedFun | Fun {
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
			return this.point( deep - 1 ).points![ this.inline_path()[ deep - 1 ] ] as InlinedFun | Fun
		}
		
		script_title( deep: number ) {
			if( !deep ) return this.file()!.uri
			const point = this.point( deep )
			return point.name || `Inlined #${ this.inline_path()[ deep - 1 ]}`
		}
		
		script( deep: number ) {
			
			const point = this.point( deep )
			if( 'asm' in point ) {
				console.log(point)
				return point.asm
			}
			
			const source = this.script_source( deep )
			return this.files().get( source.uri )!.code
		}
		
		@ $mol_mem_key
		script_source( deep: number ) {
			const point = this.point( deep )
			if( 'asm' in point  ) return { uri: 'ASM', start: 0, end: point.asm.length }
			return point.source
		}
		
		@ $mol_mem_key
		points( deep: number ) {
			return this.point( deep ).points ?? []
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
			const points = this.points()
			const next = {} as Record< string, string >
			
			if( points.some( point => point.type === 'Fun' ) ) {
				next[ 'Opt' ] = 'Opt'
			}
			
			if( points.some( point => point.type === 'InlinedFun' ) ) {
				next[ 'Inlined' ] = 'Inlined'
			}
			
			for( const point of this.points() ) {
				for( const reason of ( point.reasons ?? [] ) ) {
					if( !reason ) continue
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
				if( point.type === 'Fun' ) return this.filter_enabled( 'Opt' )
				if( point.type === 'InlinedFun' ) return this.filter_enabled( 'Inlined' )
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
		
		@ $mol_mem
		Foot() {
			if( !this.points().length ) return null as any
			return super.Foot()
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
		
		@ $mol_mem
		close_arg() {
			const path = this.path()
			return path.length
				? {
					inline: this.path().slice( 0, -1 ).join( ',' )
				}
				: {
					inline: null,
					file: null,
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
		
		@ $mol_mem_key
		inline_current( index: number ) {
			const current = this.$.$mol_state_arg.value( 'inline' ) ?? ''
			const self = this.inline_arg( index ).inline
			return current === self || current.startsWith( self + ',' )
		}
		
		@ $mol_mem
		jump_rows() {
			
			const lines = new Set<$mol_text_code_line>()
			
			const followers = this.points_followers_filtered()
			for( let i =0; i < followers.length; ++ i ) {
				const anchor = followers[i].Anchor()
				const line = ( $mol_owning_get( anchor ) as $mol_wire_atom<any,any,any> ).host
				lines.add( line )
			}
			
			return [ ... lines ]
		}
		
		@ $mol_mem
		jump( next?: number ) {
			const lines = this.jump_rows()
			if( next === undefined ) return lines.length
			if( next > lines.length ) next = 1
			if( next < 1 ) next = lines.length
			if( next ) this.Code().ensure_visible( lines[ next - 1 ] )
			return next
		}
		
		filter_enabled( id: string, next?: boolean ) {
			return this.$.$mol_state_local.value( `filter_enabled(${id})`, next ) ?? super.filter_enabled( id )
		}
		
	}
	
}
