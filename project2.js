/**
 * @Instructions
 * 		@task1 : Complete the setTexture function to handle non power of 2 sized textures
 * 		@task2 : Implement the lighting by modifying the fragment shader, constructor,
 *      @task3: 
 *      @task4: 
 * 		setMesh, draw, setAmbientLight, setSpecularLight and enableLighting functions 
 */


function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
	
	var trans1 = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	var rotatXCos = Math.cos(rotationX);
	var rotatXSin = Math.sin(rotationX);

	var rotatYCos = Math.cos(rotationY);
	var rotatYSin = Math.sin(rotationY);

	var rotatx = [
		1, 0, 0, 0,
		0, rotatXCos, -rotatXSin, 0,
		0, rotatXSin, rotatXCos, 0,
		0, 0, 0, 1
	]

	var rotaty = [
		rotatYCos, 0, -rotatYSin, 0,
		0, 1, 0, 0,
		rotatYSin, 0, rotatYCos, 0,
		0, 0, 0, 1
	]

	var test1 = MatrixMult(rotaty, rotatx);
	var test2 = MatrixMult(trans1, test1);
	var mvp = MatrixMult(projectionMatrix, test2);

	return mvp;
}


class MeshDrawer {
	// The constructor is a good place for taking care of the necessary initializations.
	constructor() {
		this.prog = InitShaderProgram(meshVS, meshFS);
		
		// Existing locations
		this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
		this.showTexLoc = gl.getUniformLocation(this.prog, 'showTex');
		this.colorLoc = gl.getUniformLocation(this.prog, 'color');
		this.vertPosLoc = gl.getAttribLocation(this.prog, 'pos');
		this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');
	
		// Light uniforms
		this.lightPosLoc = gl.getUniformLocation(this.prog, 'lightPos');
		this.enableLightingLoc = gl.getUniformLocation(this.prog, 'enableLighting');
		this.ambientLoc = gl.getUniformLocation(this.prog, 'ambient');
		
		// Normals attribute
		this.normalLoc = gl.getAttribLocation(this.prog, 'normal');
		
		// Buffers
		this.vertbuffer = gl.createBuffer();
		this.texbuffer = gl.createBuffer();
		this.normBuffer = gl.createBuffer();  // for normals
	
		this.numTriangles = 0;

		
		
		// Initialize light parameters
		this.isLightingEnabled = false;
		this.ambient = 0.1;  // default ambient value

		console.log('Shader Locations:', {
			lightPos: this.lightPosLoc,
			enableLighting: this.enableLightingLoc,
			ambient: this.ambientLoc,
			normal: this.normalLoc
		});

		this.specularLoc = gl.getUniformLocation(this.prog, 'specularStrength');

		
	}

	setSpecularLight(strength) {
		gl.useProgram(this.prog);
		gl.uniform1f(this.specularLoc, strength);
		console.log('Specular strength:', strength);
	}

	setMesh(vertPos, texCoords, normalCoords) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	
		// Normal buffer'ı güncelle
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalCoords), gl.STATIC_DRAW);
	
		this.numTriangles = vertPos.length / 3;
		console.log('Mesh set with normals:', normalCoords.length / 3); // Debug için
	}
	

	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw(trans) {
		gl.useProgram(this.prog);
		
		// MVP matrix
		gl.uniformMatrix4fv(this.mvpLoc, false, trans);
	
		// Vertices
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.enableVertexAttribArray(this.vertPosLoc);
		gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);
	
		// Texture coordinates
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
		gl.enableVertexAttribArray(this.texCoordLoc);
		gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
	
		// Normal vertices - ışıklandırma için kritik
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
		gl.enableVertexAttribArray(this.normalLoc);
		gl.vertexAttribPointer(this.normalLoc, 3, gl.FLOAT, false, 0, 0);
	
		// Light position güncelleme
		const lightPosition = [lightX, lightY, 1.0];
		gl.uniform3fv(this.lightPosLoc, lightPosition);
	
		// Enable lighting durumunu güncelleme
		gl.uniform1i(this.enableLightingLoc, this.isLightingEnabled);
		
		// Ambient değeri güncelleme
		gl.uniform1f(this.ambientLoc, this.ambient);
	
		updateLightPos();
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
	
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGB,
			gl.RGB,
			gl.UNSIGNED_BYTE,
			img
		);
	
		// 2'nin kuvveti olmayan boyutlar için
		if (!isPowerOf2(img.width) || !isPowerOf2(img.height)) {
			// Wrap parameterlerini CLAMP_TO_EDGE yapmalıyız
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			// Filtreleme metodlarını ayarlayalım
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		} else {
			// 2'nin kuvveti olan boyutlar için mipmap oluşturabiliriz
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		}
	
		gl.useProgram(this.prog);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		const sampler = gl.getUniformLocation(this.prog, 'tex');
		gl.uniform1i(sampler, 0);
	}

	showTexture(show) {
		gl.useProgram(this.prog);
		gl.uniform1i(this.showTexLoc, show);
	}

	enableLighting(show) {
		gl.useProgram(this.prog);
		this.isLightingEnabled = show;  // class variable'ı güncelle
		gl.uniform1i(this.enableLightingLoc, show);
		console.log('Lighting enabled:', show); // debug için
	}
	
	setAmbientLight(ambient) {
		gl.useProgram(this.prog);
		this.ambient = ambient;
		gl.uniform1f(this.ambientLoc, ambient);
		console.log('Ambient set to:', ambient);
	}
}


function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

function normalize(v, dst) {
	dst = dst || new Float32Array(3);
	var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	// make sure we don't divide by 0.
	if (length > 0.00001) {
		dst[0] = v[0] / length;
		dst[1] = v[1] / length;
		dst[2] = v[2] / length;
	}
	return dst;
}

// Vertex shader source code
const meshVS = `
attribute vec3 pos; 
attribute vec2 texCoord; 
attribute vec3 normal;
uniform mat4 mvp;
varying vec2 v_texCoord;
varying vec3 v_normal;
varying vec3 v_position;

void main() {
    v_texCoord = texCoord;
    // Normal vektörünü dönüştür
    v_normal = (mvp * vec4(normal, 0.0)).xyz;
    // Fragment pozisyonunu dönüştür
    v_position = (mvp * vec4(pos, 1.0)).xyz;
    gl_Position = mvp * vec4(pos, 1.0);
}`;

// Fragment shader source code
/**
 * @Task2 : You should update the fragment shader to handle the lighting
 */
const meshFS = `
precision mediump float;
uniform bool showTex;
uniform bool enableLighting;
uniform sampler2D tex;
uniform vec3 color;
uniform vec3 lightPos;
uniform float ambient;

varying vec2 v_texCoord;
varying vec3 v_normal;
varying vec3 v_position;

void main() {
    vec4 baseColor = showTex ? texture2D(tex, v_texCoord) : vec4(color, 1.0);
    
    if(enableLighting) {
        // Ambient
        vec3 ambientLight = ambient * baseColor.rgb;
        
        // Diffuse
        vec3 norm = normalize(v_normal);
        vec3 lightDir = normalize(lightPos - v_position);
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * baseColor.rgb;
        
        // Specular (sabit değer kullanıyoruz)
        float specularStrength = 0.5;
        vec3 viewDir = normalize(-v_position);
        vec3 reflectDir = reflect(-lightDir, norm);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        vec3 specular = specularStrength * spec * vec3(1.0);
        
        vec3 result = ambientLight + diffuse + specular;
        gl_FragColor = vec4(result, baseColor.a);
    } else {
        gl_FragColor = baseColor;
    }
}`;

// Light direction parameters for Task 2
var lightX = 1;
var lightY = 1;

const keys = {};
function updateLightPos() {
	const translationSpeed = 1;
	if (keys['ArrowUp']) lightY -= translationSpeed;
	if (keys['ArrowDown']) lightY += translationSpeed;
	if (keys['ArrowRight']) lightX -= translationSpeed;
	if (keys['ArrowLeft']) lightX += translationSpeed;
}
///////////////////////////////////////////////////////////////////////////////////