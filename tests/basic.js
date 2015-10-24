let expect = require('chai').expect,
  rimraf = require('rimraf'),
  mkdirp = require('mkdirp'),
  path = require('path'),
  fs = require('fs'),
  async = require('async'),
  PackageManager = require('../PackageManager')

let to_test_data_dir = path.join('tests', 'data');
let make_test_dir = function(name, cb) {
  let dir = path.join(to_test_data_dir, name);
  rimraf.sync(dir);
  return dir;
}

describe('package_manager', function() {
  it('creates packages', function(done) {
    let test_dir = make_test_dir('creates_packages');
    let pm = PackageManager(test_dir);

    var pkg = pm.create_package("test", "0.0", (err, pkg) => {

      expect(pkg.path).to.equal(path.join(test_dir, 'test', '0.0'));

      let stats = fs.lstatSync(pkg.path);
      expect(stats.isDirectory()).to.equal(true);


      async.series([
        (cb) => {
          pkg.hash((err, hash) => {
            expect(hash).to.equal("44eb56140193ae961eab22683e9e48c10b306e3f");
            cb();
          });
        },
        (cb) => {
          let info = pkg.load_info((err, info) => {
            expect(info.name).to.equal('test');
            expect(info.version).to.equal('0.0');
            cb();
          });
        }
      ], () => done()
      );
    });
  });

  it('lists packages', function(done) {
    let test_dir = make_test_dir('lists_packages');
    let pm = PackageManager(test_dir);

    async.series([
      (cb) => {
        pm.create_package("a", "0.0", cb);
      },
      (cb) => {
        pm.create_package("c", "1.0", cb);
      },
      (cb) => {
        pm.create_package("b", "0.0", cb);
      },
      (cb) => {
        pm.create_package("b", "0.1", cb);
      },
      (cb) => {
        pm.create_package("b", "0.2", cb);
      }
    ], (err, results) => {
      async.parallel([
        (cb) => {
          pm.available_local_packages((err, pkgs) => {
            expect(pkgs.length).to.eql(5);
            expect(pkgs[0].name).to.eql('a');
            expect(pkgs[0].version).to.eql('0.0');
            expect(pkgs[1].name).to.eql('b');
            expect(pkgs[1].version).to.eql('0.0');
            expect(pkgs[2].name).to.eql('b');
            expect(pkgs[2].version).to.eql('0.1');
            expect(pkgs[3].name).to.eql('b');
            expect(pkgs[3].version).to.eql('0.2');
            expect(pkgs[4].name).to.eql('c');
            expect(pkgs[4].version).to.eql('1.0');
            cb();
          });
        },
        (cb) => {
          pm.available_local_versions('a', (err, pkgs) => {
            expect(pkgs.length).to.eql(1);
            expect(pkgs[0].name).to.eql('a');
            expect(pkgs[0].version).to.eql('0.0');
            cb();
          });
        },
        (cb) => {
          pm.available_local_versions('c', (err, pkgs) => {
            expect(pkgs.length).to.eql(1);
            expect(pkgs[0].name).to.eql('c');
            expect(pkgs[0].version).to.eql('1.0');
            cb();
          });
        },
        (cb) => {
          pm.available_local_versions('b', (err, pkgs) => {
            expect(pkgs.length).to.eql(3);
            expect(pkgs[0].name).to.eql('b');
            expect(pkgs[0].version).to.eql('0.0');
            expect(pkgs[1].name).to.eql('b');
            expect(pkgs[1].version).to.eql('0.1');
            expect(pkgs[2].name).to.eql('b');
            expect(pkgs[2].version).to.eql('0.2');
            cb();
          });
        }
      ],
      () => {
        done();
      });
    });
  });

  it('pack packages', function(done) {
    let test_dir = make_test_dir('pack_packages');
    let pm = PackageManager(test_dir);

    async.waterfall([
      (cb) => {
        pm.create_package("a", "0.0", cb);
      },
      (pkg, cb) => {
        let dest_path = path.join(test_dir, 'test.tar');
        let str = pkg.pack().pipe(fs.createWriteStream(dest_path));
        str.on('finish', () => { cb(null, pkg, dest_path) });
      },
      (pkg, tar_path, cb) => {
        pkg.hash((err, hash) => {
          cb(err, hash, tar_path);
        });
      },
      (hash, tar_path, cb) => {
        rimraf.sync(path.join(test_dir, 'a'));
        cb(null, hash, tar_path)
      },
      (hash, path, cb) => {
        pm.load_packed_package(hash, fs.createReadStream(path), (err, pkg) => {
          pkg.load_info((err, info) => {
            expect(info.name).to.equal('a');
            expect(info.version).to.equal('0.0');
            cb();
          });
        })
      }
    ], () => done());
  });

  it('installer packs', function(done) {
    let test_dir = make_test_dir('installer_packs');
    let pm = PackageManager(test_dir);

    async.series([
      (cb) => {
        pm.create_package("a", "0.0", cb);
      },
      (cb) => {
        pm.create_package("c", "1.0", cb);
      },
      (cb) => {
        pm.create_package("b", "0.0", cb);
      }
    ], (err, pkgs) => {
      let found_pkgs = [
        pm.get_package('a', '0.0'),
        pm.get_package('b', '0.0'),
        pm.get_package('c', '1.0')
      ];

      pm.pack("combined", '0.0', found_pkgs);

      done();
    });
  });

});