const expect = chai.expect;

import Keyboard from '../core/input/keyboard.js';

describe('Key Event Handling', function () {
    "use strict";

    // The real KeyboardEvent constructor might not work everywhere we
    // want to run these tests
    function keyevent(typeArg, KeyboardEventInit) {
        const e = { type: typeArg };
        for (let key in KeyboardEventInit) {
            e[key] = KeyboardEventInit[key];
        }
        e.stopPropagation = sinon.spy();
        e.preventDefault = sinon.spy();
        return e;
    }

    describe('Decode Keyboard Events', function () {
        it('should decode keydown events', function (done) {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = (keysym, code, down) => {
                expect(keysym).to.be.equal(0x61);
                expect(code).to.be.equal('KeyA');
                expect(down).to.be.equal(true);
                done();
            };
            kbd._handleKeyDown(keyevent('keydown', {code: 'KeyA', key: 'a'}));
        });
        it('should decode keyup events', function (done) {
            let calls = 0;
            const kbd = new Keyboard(document);
            kbd.onkeyevent = (keysym, code, down) => {
                expect(keysym).to.be.equal(0x61);
                expect(code).to.be.equal('KeyA');
                if (calls++ === 1) {
                    expect(down).to.be.equal(false);
                    done();
                }
            };
            kbd._handleKeyDown(keyevent('keydown', {code: 'KeyA', key: 'a'}));
            kbd._handleKeyUp(keyevent('keyup', {code: 'KeyA', key: 'a'}));
        });
    });

    describe('Fake keyup', function () {
        it('should fake keyup events for virtual keyboards', function (done) {
            let count = 0;
            const kbd = new Keyboard(document);
            kbd.onkeyevent = (keysym, code, down) => {
                switch (count++) {
                    case 0:
                        expect(keysym).to.be.equal(0x61);
                        expect(code).to.be.equal('Unidentified');
                        expect(down).to.be.equal(true);
                        break;
                    case 1:
                        expect(keysym).to.be.equal(0x61);
                        expect(code).to.be.equal('Unidentified');
                        expect(down).to.be.equal(false);
                        done();
                }
            };
            kbd._handleKeyDown(keyevent('keydown', {code: 'Unidentified', key: 'a'}));
        });
    });

    describe('Track Key State', function () {
        it('should send release using the same keysym as the press', function (done) {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = (keysym, code, down) => {
                expect(keysym).to.be.equal(0x61);
                expect(code).to.be.equal('KeyA');
                if (!down) {
                    done();
                }
            };
            kbd._handleKeyDown(keyevent('keydown', {code: 'KeyA', key: 'a'}));
            kbd._handleKeyUp(keyevent('keyup', {code: 'KeyA', key: 'b'}));
        });
        it('should send the same keysym for multiple presses', function () {
            let count = 0;
            const kbd = new Keyboard(document);
            kbd.onkeyevent = (keysym, code, down) => {
                expect(keysym).to.be.equal(0x61);
                expect(code).to.be.equal('KeyA');
                expect(down).to.be.equal(true);
                count++;
            };
            kbd._handleKeyDown(keyevent('keydown', {code: 'KeyA', key: 'a'}));
            kbd._handleKeyDown(keyevent('keydown', {code: 'KeyA', key: 'b'}));
            expect(count).to.be.equal(2);
        });
        it('should do nothing on keyup events if no keys are down', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyUp(keyevent('keyup', {code: 'KeyA', key: 'a'}));
            expect(kbd.onkeyevent).to.not.have.been.called;
        });

        describe('Legacy Events', function () {
            it('should track keys using keyCode if no code', function (done) {
                const kbd = new Keyboard(document);
                kbd.onkeyevent = (keysym, code, down) => {
                    expect(keysym).to.be.equal(0x61);
                    expect(code).to.be.equal('Platform65');
                    if (!down) {
                        done();
                    }
                };
                kbd._handleKeyDown(keyevent('keydown', {keyCode: 65, key: 'a'}));
                kbd._handleKeyUp(keyevent('keyup', {keyCode: 65, key: 'b'}));
            });
            it('should ignore compositing code', function () {
                const kbd = new Keyboard(document);
                kbd.onkeyevent = (keysym, code, down) => {
                    expect(keysym).to.be.equal(0x61);
                    expect(code).to.be.equal('Unidentified');
                };
                kbd._handleKeyDown(keyevent('keydown', {keyCode: 229, key: 'a'}));
            });
            it('should track keys using keyIdentifier if no code', function (done) {
                const kbd = new Keyboard(document);
                kbd.onkeyevent = (keysym, code, down) => {
                    expect(keysym).to.be.equal(0x61);
                    expect(code).to.be.equal('Platform65');
                    if (!down) {
                        done();
                    }
                };
                kbd._handleKeyDown(keyevent('keydown', {keyIdentifier: 'U+0041', key: 'a'}));
                kbd._handleKeyUp(keyevent('keyup', {keyIdentifier: 'U+0041', key: 'b'}));
            });
        });
    });

    describe('Shuffle modifiers on macOS', function () {
        let origNavigator;
        beforeEach(function () {
            // window.navigator is a protected read-only property in many
            // environments, so we need to redefine it whilst running these
            // tests.
            origNavigator = Object.getOwnPropertyDescriptor(window, "navigator");

            Object.defineProperty(window, "navigator", {value: {}});
            if (window.navigator.platform !== undefined) {
                // Object.defineProperty() doesn't work properly in old
                // versions of Chrome
                this.skip();
            }

            window.navigator.platform = "Mac x86_64";
        });
        afterEach(function () {
            if (origNavigator !== undefined) {
                Object.defineProperty(window, "navigator", origNavigator);
            }
        });

        it('should change Alt to AltGraph', function () {
            let count = 0;
            const kbd = new Keyboard(document);
            kbd.onkeyevent = (keysym, code, down) => {
                switch (count++) {
                    case 0:
                        expect(keysym).to.be.equal(0xFF7E);
                        expect(code).to.be.equal('AltLeft');
                        break;
                    case 1:
                        expect(keysym).to.be.equal(0xFE03);
                        expect(code).to.be.equal('AltRight');
                        break;
                }
            };
            kbd._handleKeyDown(keyevent('keydown', {code: 'AltLeft', key: 'Alt', location: 1}));
            kbd._handleKeyDown(keyevent('keydown', {code: 'AltRight', key: 'Alt', location: 2}));
            expect(count).to.be.equal(2);
        });
        it('should change left Super to Alt', function (done) {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = (keysym, code, down) => {
                expect(keysym).to.be.equal(0xFFE9);
                expect(code).to.be.equal('MetaLeft');
                done();
            };
            kbd._handleKeyDown(keyevent('keydown', {code: 'MetaLeft', key: 'Meta', location: 1}));
        });
        it('should change right Super to left Super', function (done) {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = (keysym, code, down) => {
                expect(keysym).to.be.equal(0xFFEB);
                expect(code).to.be.equal('MetaRight');
                done();
            };
            kbd._handleKeyDown(keyevent('keydown', {code: 'MetaRight', key: 'Meta', location: 2}));
        });
    });

    describe('Caps Lock on iOS and macOS', function () {
        let origNavigator;
        beforeEach(function () {
            // window.navigator is a protected read-only property in many
            // environments, so we need to redefine it whilst running these
            // tests.
            origNavigator = Object.getOwnPropertyDescriptor(window, "navigator");

            Object.defineProperty(window, "navigator", {value: {}});
            if (window.navigator.platform !== undefined) {
                // Object.defineProperty() doesn't work properly in old
                // versions of Chrome
                this.skip();
            }
        });

        afterEach(function () {
            if (origNavigator !== undefined) {
                Object.defineProperty(window, "navigator", origNavigator);
            }
        });

        it('should toggle caps lock on key press on iOS', function () {
            window.navigator.platform = "iPad";
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyDown(keyevent('keydown', {code: 'CapsLock', key: 'CapsLock'}));

            expect(kbd.onkeyevent).to.have.been.calledTwice;
            expect(kbd.onkeyevent.firstCall).to.have.been.calledWith(0xFFE5, "CapsLock", true);
            expect(kbd.onkeyevent.secondCall).to.have.been.calledWith(0xFFE5, "CapsLock", false);
        });

        it('should toggle caps lock on key press on mac', function () {
            window.navigator.platform = "Mac";
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyDown(keyevent('keydown', {code: 'CapsLock', key: 'CapsLock'}));

            expect(kbd.onkeyevent).to.have.been.calledTwice;
            expect(kbd.onkeyevent.firstCall).to.have.been.calledWith(0xFFE5, "CapsLock", true);
            expect(kbd.onkeyevent.secondCall).to.have.been.calledWith(0xFFE5, "CapsLock", false);
        });

        it('should toggle caps lock on key release on iOS', function () {
            window.navigator.platform = "iPad";
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyUp(keyevent('keyup', {code: 'CapsLock', key: 'CapsLock'}));

            expect(kbd.onkeyevent).to.have.been.calledTwice;
            expect(kbd.onkeyevent.firstCall).to.have.been.calledWith(0xFFE5, "CapsLock", true);
            expect(kbd.onkeyevent.secondCall).to.have.been.calledWith(0xFFE5, "CapsLock", false);
        });

        it('should toggle caps lock on key release on mac', function () {
            window.navigator.platform = "Mac";
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyUp(keyevent('keyup', {code: 'CapsLock', key: 'CapsLock'}));

            expect(kbd.onkeyevent).to.have.been.calledTwice;
            expect(kbd.onkeyevent.firstCall).to.have.been.calledWith(0xFFE5, "CapsLock", true);
            expect(kbd.onkeyevent.secondCall).to.have.been.calledWith(0xFFE5, "CapsLock", false);
        });
    });

    describe('Japanese IM keys on Windows', function () {
        let origNavigator;
        beforeEach(function () {
            // window.navigator is a protected read-only property in many
            // environments, so we need to redefine it whilst running these
            // tests.
            origNavigator = Object.getOwnPropertyDescriptor(window, "navigator");

            Object.defineProperty(window, "navigator", {value: {}});
            if (window.navigator.platform !== undefined) {
                // Object.defineProperty() doesn't work properly in old
                // versions of Chrome
                this.skip();
            }

            window.navigator.platform = "Windows";
        });

        afterEach(function () {
            if (origNavigator !== undefined) {
                Object.defineProperty(window, "navigator", origNavigator);
            }
        });

        const keys = { 'Zenkaku': 0xff2a, 'Hankaku': 0xff2a,
                       'Alphanumeric': 0xff30, 'Katakana': 0xff26,
                       'Hiragana': 0xff25, 'Romaji': 0xff24,
                       'KanaMode': 0xff24 };
        for (let [key, keysym] of Object.entries(keys)) {
            it(`should fake key release for ${key} on Windows`, function () {
                let kbd = new Keyboard(document);
                kbd.onkeyevent = sinon.spy();
                kbd._handleKeyDown(keyevent('keydown', {code: 'FakeIM', key: key}));

                expect(kbd.onkeyevent).to.have.been.calledTwice;
                expect(kbd.onkeyevent.firstCall).to.have.been.calledWith(keysym, "FakeIM", true);
                expect(kbd.onkeyevent.secondCall).to.have.been.calledWith(keysym, "FakeIM", false);
            });
        }
    });

    describe('Escape AltGraph on Windows', function () {
        let origNavigator;
        beforeEach(function () {
            // window.navigator is a protected read-only property in many
            // environments, so we need to redefine it whilst running these
            // tests.
            origNavigator = Object.getOwnPropertyDescriptor(window, "navigator");

            Object.defineProperty(window, "navigator", {value: {}});
            if (window.navigator.platform !== undefined) {
                // Object.defineProperty() doesn't work properly in old
                // versions of Chrome
                this.skip();
            }

            window.navigator.platform = "Windows x86_64";

            this.clock = sinon.useFakeTimers();
        });
        afterEach(function () {
            if (origNavigator !== undefined) {
                Object.defineProperty(window, "navigator", origNavigator);
            }
            if (this.clock !== undefined) {
                this.clock.restore();
            }
        });

        it('should supress ControlLeft until it knows if it is AltGr', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyDown(keyevent('keydown', {code: 'ControlLeft', key: 'Control', location: 1}));
            expect(kbd.onkeyevent).to.not.have.been.called;
        });

        it('should not trigger on repeating ControlLeft', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyDown(keyevent('keydown', {code: 'ControlLeft', key: 'Control', location: 1}));
            kbd._handleKeyDown(keyevent('keydown', {code: 'ControlLeft', key: 'Control', location: 1}));
            expect(kbd.onkeyevent).to.have.been.calledTwice;
            expect(kbd.onkeyevent.firstCall).to.have.been.calledWith(0xffe3, "ControlLeft", true);
            expect(kbd.onkeyevent.secondCall).to.have.been.calledWith(0xffe3, "ControlLeft", true);
        });

        it('should not supress ControlRight', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyDown(keyevent('keydown', {code: 'ControlRight', key: 'Control', location: 2}));
            expect(kbd.onkeyevent).to.have.been.calledOnce;
            expect(kbd.onkeyevent).to.have.been.calledWith(0xffe4, "ControlRight", true);
        });

        it('should release ControlLeft after 100 ms', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyDown(keyevent('keydown', {code: 'ControlLeft', key: 'Control', location: 1}));
            expect(kbd.onkeyevent).to.not.have.been.called;
            this.clock.tick(100);
            expect(kbd.onkeyevent).to.have.been.calledOnce;
            expect(kbd.onkeyevent).to.have.been.calledWith(0xffe3, "ControlLeft", true);
        });

        it('should release ControlLeft on other key press', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyDown(keyevent('keydown', {code: 'ControlLeft', key: 'Control', location: 1}));
            expect(kbd.onkeyevent).to.not.have.been.called;
            kbd._handleKeyDown(keyevent('keydown', {code: 'KeyA', key: 'a'}));
            expect(kbd.onkeyevent).to.have.been.calledTwice;
            expect(kbd.onkeyevent.firstCall).to.have.been.calledWith(0xffe3, "ControlLeft", true);
            expect(kbd.onkeyevent.secondCall).to.have.been.calledWith(0x61, "KeyA", true);

            // Check that the timer is properly dead
            kbd.onkeyevent.resetHistory();
            this.clock.tick(100);
            expect(kbd.onkeyevent).to.not.have.been.called;
        });

        it('should release ControlLeft on other key release', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyDown(keyevent('keydown', {code: 'KeyA', key: 'a'}));
            kbd._handleKeyDown(keyevent('keydown', {code: 'ControlLeft', key: 'Control', location: 1}));
            expect(kbd.onkeyevent).to.have.been.calledOnce;
            expect(kbd.onkeyevent.firstCall).to.have.been.calledWith(0x61, "KeyA", true);
            kbd._handleKeyUp(keyevent('keyup', {code: 'KeyA', key: 'a'}));
            expect(kbd.onkeyevent).to.have.been.calledThrice;
            expect(kbd.onkeyevent.secondCall).to.have.been.calledWith(0xffe3, "ControlLeft", true);
            expect(kbd.onkeyevent.thirdCall).to.have.been.calledWith(0x61, "KeyA", false);

            // Check that the timer is properly dead
            kbd.onkeyevent.resetHistory();
            this.clock.tick(100);
            expect(kbd.onkeyevent).to.not.have.been.called;
        });

        it('should generate AltGraph for quick Ctrl+Alt sequence', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyDown(keyevent('keydown', {code: 'ControlLeft', key: 'Control', location: 1, timeStamp: Date.now()}));
            this.clock.tick(20);
            kbd._handleKeyDown(keyevent('keydown', {code: 'AltRight', key: 'Alt', location: 2, timeStamp: Date.now()}));
            expect(kbd.onkeyevent).to.have.been.calledOnce;
            expect(kbd.onkeyevent).to.have.been.calledWith(0xfe03, 'AltRight', true);

            // Check that the timer is properly dead
            kbd.onkeyevent.resetHistory();
            this.clock.tick(100);
            expect(kbd.onkeyevent).to.not.have.been.called;
        });

        it('should generate Ctrl, Alt for slow Ctrl+Alt sequence', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyDown(keyevent('keydown', {code: 'ControlLeft', key: 'Control', location: 1, timeStamp: Date.now()}));
            this.clock.tick(60);
            kbd._handleKeyDown(keyevent('keydown', {code: 'AltRight', key: 'Alt', location: 2, timeStamp: Date.now()}));
            expect(kbd.onkeyevent).to.have.been.calledTwice;
            expect(kbd.onkeyevent.firstCall).to.have.been.calledWith(0xffe3, "ControlLeft", true);
            expect(kbd.onkeyevent.secondCall).to.have.been.calledWith(0xffea, "AltRight", true);

            // Check that the timer is properly dead
            kbd.onkeyevent.resetHistory();
            this.clock.tick(100);
            expect(kbd.onkeyevent).to.not.have.been.called;
        });

        it('should pass through single Alt', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyDown(keyevent('keydown', {code: 'AltRight', key: 'Alt', location: 2}));
            expect(kbd.onkeyevent).to.have.been.calledOnce;
            expect(kbd.onkeyevent).to.have.been.calledWith(0xffea, 'AltRight', true);
        });

        it('should pass through single AltGr', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();
            kbd._handleKeyDown(keyevent('keydown', {code: 'AltRight', key: 'AltGraph', location: 2}));
            expect(kbd.onkeyevent).to.have.been.calledOnce;
            expect(kbd.onkeyevent).to.have.been.calledWith(0xfe03, 'AltRight', true);
        });
    });

    describe('IME composition', function () {
        function createKeyboard() {
            const touchInput = { value: '' };
            const kbd = new Keyboard(document, touchInput);
            kbd._scheduleRfbKeySend = () => {};
            return { kbd, touchInput };
        }

        it('should send every character from the first composition update', function () {
            const { kbd } = createKeyboard();

            kbd._handleCompositionStart({data: ''});
            kbd._handleCompositionUpdate({data: '中国'});

            expect(kbd._rfbKeyQueue.map((event) => [event.keysym, event.down])).to.deep.equal([
                [0x01004e2d, true], [0x01004e2d, false],
                [0x010056fd, true], [0x010056fd, false],
            ]);
        });

        it('should replace the changed part of a composition', function () {
            const { kbd } = createKeyboard();

            kbd._handleCompositionStart({data: ''});
            kbd._handleCompositionUpdate({data: '中'});
            kbd._handleCompositionUpdate({data: '中国'});
            kbd._handleCompositionUpdate({data: '中文'});

            const events = kbd._rfbKeyQueue.map((event) => [event.keysym, event.down]);
            expect(events).to.deep.equal([
                [0x01004e2d, true], [0x01004e2d, false],
                [0x010056fd, true], [0x010056fd, false],
                [0xff08, true], [0xff08, false],
                [0x01006587, true], [0x01006587, false],
            ]);
        });

        it('should not resend text already sent during composition', function () {
            const { kbd } = createKeyboard();

            kbd._handleCompositionStart({data: ''});
            kbd._handleCompositionUpdate({data: '中国'});
            kbd._handleCompositionEnd({data: '中国'});
            kbd._handleInput({data: '中国', isComposing: false, inputType: 'insertText'});

            const keyDowns = kbd._rfbKeyQueue
                .filter((event) => event.down)
                .map((event) => event.keysym);
            expect(keyDowns).to.deep.equal([0x01004e2d, 0x010056fd]);
        });

        it('should replace preedit text with the complete committed phrase', function () {
            const { kbd } = createKeyboard();
            const committedText = '中华人民共和国万岁';

            kbd._handleCompositionStart({data: ''});
            kbd._handleCompositionUpdate({data: 'zhonghua'});
            kbd._handleCompositionEnd({data: committedText});
            kbd._handleInput({data: committedText, isComposing: false, inputType: 'insertText'});

            const keyDowns = kbd._rfbKeyQueue
                .filter((event) => event.down)
                .map((event) => event.keysym);
            expect(keyDowns).to.deep.equal([
                0x7a, 0x68, 0x6f, 0x6e, 0x67, 0x68, 0x75, 0x61,
                0xff08, 0xff08, 0xff08, 0xff08, 0xff08, 0xff08, 0xff08, 0xff08,
                0x01004e2d, 0x0100534e, 0x01004eba, 0x01006c11,
                0x01005171, 0x0100548c, 0x010056fd, 0x01004e07, 0x01005c81,
            ]);
        });
    });

    describe('Missing Shift keyup on Windows', function () {
        let origNavigator;
        beforeEach(function () {
            // window.navigator is a protected read-only property in many
            // environments, so we need to redefine it whilst running these
            // tests.
            origNavigator = Object.getOwnPropertyDescriptor(window, "navigator");

            Object.defineProperty(window, "navigator", {value: {}});
            if (window.navigator.platform !== undefined) {
                // Object.defineProperty() doesn't work properly in old
                // versions of Chrome
                this.skip();
            }

            window.navigator.platform = "Windows x86_64";

            this.clock = sinon.useFakeTimers();
        });
        afterEach(function () {
            if (origNavigator !== undefined) {
                Object.defineProperty(window, "navigator", origNavigator);
            }
            if (this.clock !== undefined) {
                this.clock.restore();
            }
        });

        it('should fake a left Shift keyup', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();

            kbd._handleKeyDown(keyevent('keydown', {code: 'ShiftLeft', key: 'Shift', location: 1}));
            expect(kbd.onkeyevent).to.have.been.calledOnce;
            expect(kbd.onkeyevent).to.have.been.calledWith(0xffe1, 'ShiftLeft', true);
            kbd.onkeyevent.resetHistory();

            kbd._handleKeyDown(keyevent('keydown', {code: 'ShiftRight', key: 'Shift', location: 2}));
            expect(kbd.onkeyevent).to.have.been.calledOnce;
            expect(kbd.onkeyevent).to.have.been.calledWith(0xffe2, 'ShiftRight', true);
            kbd.onkeyevent.resetHistory();

            kbd._handleKeyUp(keyevent('keyup', {code: 'ShiftLeft', key: 'Shift', location: 1}));
            expect(kbd.onkeyevent).to.have.been.calledTwice;
            expect(kbd.onkeyevent).to.have.been.calledWith(0xffe2, 'ShiftRight', false);
            expect(kbd.onkeyevent).to.have.been.calledWith(0xffe1, 'ShiftLeft', false);
        });

        it('should fake a right Shift keyup', function () {
            const kbd = new Keyboard(document);
            kbd.onkeyevent = sinon.spy();

            kbd._handleKeyDown(keyevent('keydown', {code: 'ShiftLeft', key: 'Shift', location: 1}));
            expect(kbd.onkeyevent).to.have.been.calledOnce;
            expect(kbd.onkeyevent).to.have.been.calledWith(0xffe1, 'ShiftLeft', true);
            kbd.onkeyevent.resetHistory();

            kbd._handleKeyDown(keyevent('keydown', {code: 'ShiftRight', key: 'Shift', location: 2}));
            expect(kbd.onkeyevent).to.have.been.calledOnce;
            expect(kbd.onkeyevent).to.have.been.calledWith(0xffe2, 'ShiftRight', true);
            kbd.onkeyevent.resetHistory();

            kbd._handleKeyUp(keyevent('keyup', {code: 'ShiftRight', key: 'Shift', location: 2}));
            expect(kbd.onkeyevent).to.have.been.calledTwice;
            expect(kbd.onkeyevent).to.have.been.calledWith(0xffe2, 'ShiftRight', false);
            expect(kbd.onkeyevent).to.have.been.calledWith(0xffe1, 'ShiftLeft', false);
        });
    });
});
