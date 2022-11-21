class Juego {
  // Longitud del cuadrado en pixeles
  static longitud_cuadrado = screen.width > 420 ? 30 : 20;
  static columnas = 15;
  static filas = 15;
  static ancho_canva = this.longitud_cuadrado * this.columnas;
  static alto_canva = this.longitud_cuadrado * this.filas;
  static color_vacio = "#eaeaea";
  static color_borde = "#ffffff";
  static color_fila_eliminada = "#d81c38";
  // When a piece collapses with something at its bottom, how many time wait for putting another piece? (in ms)
  static tiempo_nuevaPieza = 300;
  // Speed of falling piece (in ms)
  static velocidad_pieza = 300;
  // Animation time when a row is being deleted
  static tiempo_animacionDelete = 500;
  // Score to add when a square dissapears (for each square)
  static puntaje_por_cuadrado = 1;
  static COLORS = [
    "#ffd300",
    "#de38c8",
    "#652ec7",
    "#33135c",
    "#13ca91",
    "#ff9472",
    "#35212a",
    "#ff8b8b",
    "#28cf75",
    "#00a9fe",
    "#04005e",
    "#120052",
    "#272822",
    "#f92672",
    "#66d9ef",
    "#a6e22e",
    "#fd971f",
  ];

  constructor(canvasId) {
    this.canvasId = canvasId;
    this.timeoutFlag = false;
    this.board = [];
    this.piezasExistentes = [];
    this.globalX = 0;
    this.globalY = 0;
    this.pausa = true;
    this.currentFigure = null;
    this.sounds = {};
    this.canPlay = false;
    this.intervalId = null;
    this.init();
  }

  //================= EJECUCION DEL JUEGO =================//
  init() {
    this.showWelcome();//JP
    this.initDomElements();//JP
    this.initSounds();//LJ
    this.resetGame();//LJ
    this.draw();//DD
    this.initControls();//DD
  }

  //================= MODAL BIENVENIDA =================//
  showWelcome() {
    Swal.fire(
      "<h1 class='title'>Bienvenidos</h1>",
      `
        <strong class='title'>Controles:</strong>
        <ul class="list-group">
            <li class="list-group-item title"> <kbd>P</kbd><br>Pausar o reanudar </li>
            <li class="list-group-item title"> <kbd>R</kbd><br>Rotar</li>
            <li class="list-group-item title"> <kbd>Flechas de dirección</kbd><br>Mover figura hacia esa dirección</li>
            <li class="list-group-item title"><strong>También puedes usar los botones si estás en móvil</strong></li>
        </ul>
        <hr>
        <strong class='title'>Creado por:</strong>
        <div class="d-flex">
            <img src="../../assets/img/LogoJP.png" class="img-fluid logo" alt="">
            <img src="../../assets/img/LogoLJ.png" class="img-fluid logo" alt="">
            <img src="../../assets/img/LogoDD.png" class="img-fluid logo" alt="">
        </div>
        `
    );
  }

  resetJuego() {
    this.score = 0;// conteo
    this.sounds.success.currentTime = 0;
    this.sounds.success.pause();//llena fila
    this.sounds.background.currentTime = 0;//musica
    this.sounds.background.pause();
    this.tableroDeInicioYPiezasExistentes(); //tableroDeInicioYPiezasExistentes-initBoardAndExistingPieces
    this.elegirFiguraAleatoria(); //elegir figura aleatoria chooseRandomFigure
    this.reinicieGlobalXEY(); //restartGlobalXAndY - reinicie Global X e Y
    this.sincronizarPiezasExistentesConTablero();//sincronizar piezas existentes con tablero - syncExistingPiecesWithBoard
    this.refrescarElConteo();//refrescar el conteo - refreshScore
    this.pausarJuego();//pausar juego - pauseGame
  }

  initControls() {
    document.addEventListener("keydown", (e) => {
      const { code } = e;
      if (!this.canPlay && code !== "KeyP") {
        return;
      }
      switch (code) {
        case "ArrowRight":
          this.attemptMoveRight();
          break;
        case "ArrowLeft":
          this.attemptMoveLeft();
          break;
        case "ArrowDown":
          this.attemptMoveDown();
          break;
        case "KeyR":
        case "ArrowUp":
          this.attemptRotate();
          break;
        case "KeyP":
          this.pausarOReanudarElJuego();
          break;
      }
      this.sincronizarPiezasExistentesConTablero();
    });

    this.$btnDown.addEventListener("click", () => {
      if (!this.canPlay) return;
      this.attemptMoveDown();
    });
    this.$btnRight.addEventListener("click", () => {
      if (!this.canPlay) return;
      this.attemptMoveRight();
    });
    this.$btnLeft.addEventListener("click", () => {
      if (!this.canPlay) return;
      this.attemptMoveLeft();
    });
    this.$btnRotate.addEventListener("click", () => {
      if (!this.canPlay) return;
      this.attemptRotate();
    });
    [this.$btnPause, this.$btnResume].forEach(($btn) =>
      $btn.addEventListener("click", () => {
        this.pausarOReanudarElJuego();
      })
    );
  }

  attemptMoveRight() {
    if (this.figureCanMoveRight()) {
      this.globalX++;
    }
  }

  attemptMoveLeft() {
    if (this.figureCanMoveLeft()) {
      this.globalX--;
    }
  }

  attemptMoveDown() {
    if (this.figureCanMoveDown()) {
      this.globalY++;
    }
  }

  attemptRotate() {
    this.rotateFigure();
  }

  pausarOReanudarElJuego() { //pausar o reanudar el juego - pauseOrResumeGame
    if (this.pausa) {
      this.reanudarElJuego();//reanudar el juego - resumeGame
      this.$btnResume.hidden = true;
      this.$btnPause.hidden = false;
    } else {
      this.pausarJuego();
      this.$btnResume.hidden = false;
      this.$btnPause.hidden = true;
    }
  }

  pausarJuego() {
    this.sounds.background.pause();
    this.pausa = true;
    this.canPlay = false;
    clearInterval(this.intervalId);
  }

  reanudarElJuego() {
    this.sounds.background.play();
    this.refrescarElConteo();
    this.pausa = false;//paused
    this.canPlay = true;//canPlay - Poder jugar
    this.intervalId = setInterval(this.mainLoop.bind(this), Juego.velocidad_pieza);
  }

  moveFigurePointsToExistingPieces() {
    this.canPlay = false;
    for (const point of this.currentFigure.getPoints()) {
      point.x += this.globalX;
      point.y += this.globalY;
      this.piezasExistentes[point.y][point.x] = {
        taken: true,
        color: point.color,
      };
    }
    this.reinicieGlobalXEY();
    this.canPlay = true;
  }

  playerLoses() {
    // Check if there's something at Y 1. Maybe it is not fair for the player, but it works
    for (const point of this.piezasExistentes[1]) {
      if (point.taken) {
        return true;
      }
    }
    return false;
  }

  getPointsToDelete = () => {
    const points = [];
    let y = 0;
    for (const row of this.piezasExistentes) {
      const isRowFull = row.every((point) => point.taken);
      if (isRowFull) {
        // We only need the Y coordinate
        points.push(y);
      }
      y++;
    }
    return points;
  };

  changeDeletedRowColor(yCoordinates) {
    for (let y of yCoordinates) {
      for (const point of this.piezasExistentes[y]) {
        point.color = Juego.color_fila_eliminada;
      }
    }
  }

  addScore(rows) {
    if (Juego.velocidad_pieza > 0) {
      Juego.velocidad_pieza -= rows.length * 20;
      clearInterval(this.intervalId);
      this.intervalId = setInterval(this.mainLoop.bind(this), Juego.velocidad_pieza);
    }
    this.score += Juego.puntaje_por_cuadrado * Juego.columnas * rows.length;
    this.refreshScore();
  }

  removeRowsFromExistingPieces(yCoordinates) {
    for (let y of yCoordinates) {
      for (const point of this.piezasExistentes[y]) {
        point.color = Juego.color_vacio;
        point.taken = false;
      }
    }
  }

  verifyAndDeleteFullRows() {//verificar y eliminar filas completas
    // Here be dragons
    const yCoordinates = this.getPointsToDelete();//obtenerPuntosParaEliminar
    if (yCoordinates.length <= 0) return;
    this.addScore(yCoordinates);
    this.sounds.success.currentTime = 0;
    this.sounds.success.play();
    this.changeDeletedRowColor(yCoordinates);//cambiar el color de la fila eliminada
    this.canPlay = false;
    setTimeout(() => { //establecer tiempo de espera
      this.sounds.success.pause();
      this.removeRowsFromExistingPieces(yCoordinates);//eliminar filas de piezas existentes
      this.sincronizarPiezasExistentesConTablero();
      const invertedCoordinates = Array.from(yCoordinates);
      // Ahora las coordenadas están en orden descendente
      invertedCoordinates.reverse();//Coordenadas invertidas

      for (let yCoordinate of invertedCoordinates) {
        for (let y = Juego.filas - 1; y >= 0; y--) {
          for (let x = 0; x < this.piezasExistentes[y].length; x++) {
            if (y < yCoordinate) {
              let counter = 0;
              let auxiliarY = y;
              while (
                this.isEmptyPoint(x, auxiliarY + 1) &&
                !this.absolutePointOutOfLimits(x, auxiliarY + 1) &&
                counter < yCoordinates.length
              ) {
                this.piezasExistentes[auxiliarY + 1][x] =
                  this.piezasExistentes[auxiliarY][x];
                this.piezasExistentes[auxiliarY][x] = {
                  color: Juego.color_vacio,
                  taken: false,
                };

                this.sincronizarPiezasExistentesConTablero();
                counter++;
                auxiliarY++;
              }
            }
          }
        }
      }

      this.sincronizarPiezasExistentesConTablero();
      this.canPlay = true;
    }, Juego.tiempo_animacionDelete);
  }

  mainLoop() {
    if (!this.canPlay) {
      return;
    }
    // If figure can move down, move down
    if (this.figureCanMoveDown()) {
      this.globalY++;
    } else {
      // If figure cannot, then we start a timeout because
      // player can move figure to keep it going down
      // for example when the figure collapses with another points but there's remaining
      // space at the left or right and the player moves there so the figure can keep going down
      if (this.timeoutFlag) return;
      this.timeoutFlag = true;
      setTimeout(() => {
        this.timeoutFlag = false;
        // If the time expires, we re-check if figure cannot keep going down. If it can
        // (because player moved it) then we return and keep the loop
        if (this.figureCanMoveDown()) {
          return;
        }
        // At this point, we know that the figure collapsed either with the floor
        // or with another point. So we move all the figure to the existing pieces array
        this.sounds.tap.currentTime = 0;
        this.sounds.tap.play();
        this.moveFigurePointsToExistingPieces();
        if (this.playerLoses()) {
          Swal.fire("Juego terminado", "Inténtalo de nuevo");
          this.sounds.background.pause();
          this.canPlay = false;
          this.resetGame();
          return;
        }
        this.verifyAndDeleteFullRows();
        this.elegirFiguraAleatoria();//elegir figura aleatoria-chooseRandomFigure
        this.sincronizarPiezasExistentesConTablero();
      }, Juego.tiempo_nuevaPieza);
    }
    this.sincronizarPiezasExistentesConTablero();
  }

  limpiarElTableroDeJuegoYSuperponerLasPiezasExistentes() {
    for (let y = 0; y < Juego.filas; y++) {
      for (let x = 0; x < Juego.columnas; x++) {
        this.board[y][x] = {
          color: Juego.color_vacio,
          taken: false,
        };
        // Overlap existing piece if any
        if (this.piezasExistentes[y][x].taken) {
          this.board[y][x].color = this.piezasExistentes[y][x].color;
        }
      }
    }
  }

  superposiciónDeLaFiguraActualEnElTableroDeJuego() {
    if (!this.currentFigure) return;
    for (const point of this.currentFigure.getPoints()) {
      this.board[point.y + this.globalY][point.x + this.globalX].color =
        point.color;
    }
  }

  sincronizarPiezasExistentesConTablero() {
    this.limpiarElTableroDeJuegoYSuperponerLasPiezasExistentes();//limpiar el tablero de juego y superponer las piezas existentes - cleanGameBoardAndOverlapExistingPieces
    this.superposiciónDeLaFiguraActualEnElTableroDeJuego();//superposición de la figura actual en el tablero de juego - overlapCurrentFigureOnGameBoard
  }

  draw() {
    let x = 0,
      y = 0;
    for (const row of this.board) {
      x = 0;
      for (const point of row) {
        this.canvasContext.fillStyle = point.color;
        this.canvasContext.fillRect(
          x,
          y,
          Juego.longitud_cuadrado,
          Juego.longitud_cuadrado
        );
        this.canvasContext.restore();
        this.canvasContext.strokeStyle = Juego.color_borde;
        this.canvasContext.strokeRect(
          x,
          y,
          Juego.longitud_cuadrado,
          Juego.longitud_cuadrado
        );
        x += Juego.longitud_cuadrado;
      }
      y += Juego.longitud_cuadrado;
    }
    setTimeout(() => {
      requestAnimationFrame(this.draw.bind(this));
    }, 17);
  }

  refrescarElConteo() {
    this.$score.textContent = `SCORE: ${this.score}`;
  }

  initSounds() {
    this.sounds.background = Utils.loadSound(
      "../../assets/sounds/NewDonkBit.mp3",//musica
      true
    );
    this.sounds.success = Utils.loadSound("../../assets/sounds/success.wav");//llena fila
    this.sounds.denied = Utils.loadSound("../../assets/sounds/denied.wav");//error o no movimiento
    this.sounds.tap = Utils.loadSound("../../assets/sounds/tap.wav");//game over
  }

  initDomElements() {
    this.$canvas = document.querySelector("#" + this.canvasId);
    this.$score = document.querySelector("#puntaje");
    this.$btnPause = document.querySelector("#btnPausar");
    this.$btnResume = document.querySelector("#btnIniciar");
    this.$btnRotate = document.querySelector("#btnRotar");
    this.$btnDown = document.querySelector("#btnAbajo");
    this.$btnRight = document.querySelector("#btnDerecha");
    this.$btnLeft = document.querySelector("#btnIzquierda");
    this.$canvas.setAttribute("width", Juego.ancho_canva + "px");
    this.$canvas.setAttribute("height", Juego.alto_canva + "px");
    this.canvasContext = this.$canvas.getContext("2d");
  }

  elegirFiguraAleatoria() { //elegir figura aleatoria-chooseRandomFigure
    this.figuraActual = this.obtenerFiguraAleatoria();//figura actual-currentFigure   obtenerFiguraAleatoria-getRandomFigure
  }

  reinicieGlobalXEY() {
    this.globalX = Math.floor(Juego.columnas / 2) - 1;
    this.globalY = 0;
  }

  getRandomFigure() {
    /*
     * Nombres de los tetrominós tomados de: https://www.joe.co.uk/gaming/tetris-block-names-221127
     * Regresamos una nueva instancia en cada ocasión, pues si definiéramos las figuras en constantes o variables, se tomaría la misma
     * referencia en algunas ocasiones
     * */
    switch (Utils.getRandomNumberInRange(1, 7)) {
      case 1:
        /*
                El cuadrado (smashboy)

                **
                **
                */
        return new Tetromino([
          [new Point(0, 0), new Point(1, 0), new Point(0, 1), new Point(1, 1)],
        ]);
      case 2:
        /*
                La línea (hero)

                ****
                */
        return new Tetromino([
          [new Point(0, 0), new Point(1, 0), new Point(2, 0), new Point(3, 0)],
          [new Point(0, 0), new Point(0, 1), new Point(0, 2), new Point(0, 3)],
        ]);
      case 3:
        /*
                La L (orange ricky)
                  *
                ***

                */

        return new Tetromino([
          [new Point(0, 1), new Point(1, 1), new Point(2, 1), new Point(2, 0)],
          [new Point(0, 0), new Point(0, 1), new Point(0, 2), new Point(1, 2)],
          [new Point(0, 0), new Point(0, 1), new Point(1, 0), new Point(2, 0)],
          [new Point(0, 0), new Point(1, 0), new Point(1, 1), new Point(1, 2)],
        ]);
      case 4:
        /*
                La J (blue ricky)
                *
                ***

                */

        return new Tetromino([
          [new Point(0, 0), new Point(0, 1), new Point(1, 1), new Point(2, 1)],
          [new Point(0, 0), new Point(1, 0), new Point(0, 1), new Point(0, 2)],
          [new Point(0, 0), new Point(1, 0), new Point(2, 0), new Point(2, 1)],
          [new Point(0, 2), new Point(1, 2), new Point(1, 1), new Point(1, 0)],
        ]);
      case 5:
        /*
               La Z (Cleveland Z)
               **
                **
               */

        return new Tetromino([
          [new Point(0, 0), new Point(1, 0), new Point(1, 1), new Point(2, 1)],
          [new Point(0, 1), new Point(1, 1), new Point(1, 0), new Point(0, 2)],
        ]);
      case 6:
        /*
               La otra Z (Rhode island Z)
                **
               **
               */
        return new Tetromino([
          [new Point(0, 1), new Point(1, 1), new Point(1, 0), new Point(2, 0)],
          [new Point(0, 0), new Point(0, 1), new Point(1, 1), new Point(1, 2)],
        ]);
      case 7:
      default:
        /*
               La T (Teewee)

                *
               ***
               */
        return new Tetromino([
          [new Point(0, 1), new Point(1, 1), new Point(1, 0), new Point(2, 1)],
          [new Point(0, 0), new Point(0, 1), new Point(0, 2), new Point(1, 1)],
          [new Point(0, 0), new Point(1, 0), new Point(2, 0), new Point(1, 1)],
          [new Point(0, 1), new Point(1, 0), new Point(1, 1), new Point(1, 2)],
        ]);
    }
  }

  tableroDeInicioYPiezasExistentes() { //Tablero de inicio y piezas existentes-initBoardAndExistingPieces
    this.board = [];
    this.piezasExistentes = [];//Piezas existentes - existingPieces
    for (let y = 0; y < Juego.filas; y++) {
      this.board.push([]);
      this.piezasExistentes.push([]);
      for (let x = 0; x < Juego.columnas; x++) {
        this.board[y].push({
          color: Juego.color_vacio,
          taken: false,
        });
        this.piezasExistentes[y].push({
          taken: false,
          color: Juego.color_vacio,
        });
      }
    }
  }

  /**
   *
   * @param point An object that has x and y properties; the coordinates shouldn't be global, but relative to the point
   * @returns {boolean}
   */
  relativePointOutOfLimits(point) {
    const absoluteX = point.x + this.globalX;
    const absoluteY = point.y + this.globalY;
    return this.absolutePointOutOfLimits(absoluteX, absoluteY);
  }

  /**
   * @param absoluteX
   * @param absoluteY
   * @returns {boolean}
   */
  absolutePointOutOfLimits(absoluteX, absoluteY) {
    return (
      absoluteX < 0 ||
      absoluteX > Juego.columnas - 1 ||
      absoluteY < 0 ||
      absoluteY > Juego.filas - 1
    );
  }

  // It returns true even if the point is not valid (for example if it is out of limit, because it is not the function's responsibility)
  isEmptyPoint(x, y) {
    if (!this.piezasExistentes[y]) return true;
    if (!this.piezasExistentes[y][x]) return true;
    if (this.piezasExistentes[y][x].taken) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Check if a point (in the game board) is valid to put another point there.
   * @param point the point to check, with relative coordinates
   * @param points an array of points that conforms a figure
   */
  isValidPoint(point, points) {
    const emptyPoint = this.isEmptyPoint(
      this.globalX + point.x,
      this.globalY + point.y
    );
    const hasSameCoordinateOfFigurePoint =
      points.findIndex((p) => {
        return p.x === point.x && p.y === point.y;
      }) !== -1;
    const outOfLimits = this.relativePointOutOfLimits(point);
    if ((emptyPoint || hasSameCoordinateOfFigurePoint) && !outOfLimits) {
      return true;
    } else {
      return false;
    }
  }

  figureCanMoveRight() {
    if (!this.currentFigure) return false;
    for (const point of this.currentFigure.getPoints()) {
      const newPoint = new Point(point.x + 1, point.y);
      if (!this.isValidPoint(newPoint, this.currentFigure.getPoints())) {
        return false;
      }
    }
    return true;
  }

  figureCanMoveLeft() {
    if (!this.currentFigure) return false;
    for (const point of this.currentFigure.getPoints()) {
      const newPoint = new Point(point.x - 1, point.y);
      if (!this.isValidPoint(newPoint, this.currentFigure.getPoints())) {
        return false;
      }
    }
    return true;
  }

  figureCanMoveDown() {
    if (!this.currentFigure) return false;
    for (const point of this.currentFigure.getPoints()) {
      const newPoint = new Point(point.x, point.y + 1);
      if (!this.isValidPoint(newPoint, this.currentFigure.getPoints())) {
        return false;
      }
    }
    return true;
  }

  figureCanRotate() {
    const newPointsAfterRotate = this.currentFigure.getNextRotation();
    for (const rotatedPoint of newPointsAfterRotate) {
      if (!this.isValidPoint(rotatedPoint, this.currentFigure.getPoints())) {
        return false;
      }
    }
    return true;
  }

  rotateFigure() {
    if (!this.figureCanRotate()) {
      this.sounds.denied.currentTime = 0;
      this.sounds.denied.play();
      return;
    }
    this.currentFigure.points = this.currentFigure.getNextRotation();
    this.currentFigure.incrementRotationIndex();
  }

  async preguntarAlUsuarioConfirmarReinicioDelJuego() {//Preguntar al usuario Confirmar reinicio del juego - askUserConfirmResetGame
    this.pausarJuego();
    const result = await Swal.fire({
      title: "Reiniciar",
      text: "¿Quieres reiniciar el juego?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#fdbf9c",
      cancelButtonColor: "#4A42F3",
      cancelButtonText: "No",
      confirmButtonText: "Sí",
    });
    if (result.value) {
      this.resetJuego();
    } else {
      this.reanudarElJuego();
    }
  }
}

class Utils {
  static getRandomNumberInRange = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  static getRandomColor() {
    return Juego.COLORS[Utils.getRandomNumberInRange(0, Juego.COLORS.length - 1)];
  }

  static loadSound(src, loop) {
    const sound = document.createElement("audio");
    sound.src = src;
    sound.setAttribute("preload", "auto");
    sound.setAttribute("controls", "none");
    sound.loop = loop || false;
    sound.style.display = "none";
    document.body.appendChild(sound);
    return sound;
  }
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Tetromino {
  constructor(rotations) {
    this.rotations = rotations;
    this.rotationIndex = 0;
    this.points = this.rotations[this.rotationIndex];
    const randomColor = Utils.getRandomColor();
    this.rotations.forEach((points) => {
      points.forEach((point) => {
        point.color = randomColor;
      });
    });
    this.incrementRotationIndex();
  }

  getPoints() {
    return this.points;
  }

  incrementRotationIndex() {
    if (this.rotations.length <= 0) {
      this.rotationIndex = 0;
    } else {
      if (this.rotationIndex + 1 >= this.rotations.length) {
        this.rotationIndex = 0;
      } else {
        this.rotationIndex++;
      }
    }
  }

  getNextRotation() {
    return this.rotations[this.rotationIndex];
  }
}

const game = new Juego("canvas");
document.querySelector("#reset").addEventListener("click", () => {
  game.askUserConfirmResetGame();
});
